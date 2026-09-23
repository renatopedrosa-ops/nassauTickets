import { withTransaction } from '../db/pool.js';
import { config } from '../config/env.js';
import { STATUS } from '../domain/ticketStateMachine.js';
import { formatTicketNumber, priorityOrder } from '../domain/ticketTypes.js';
import { counterRepository } from '../repositories/counterRepository.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../utils/AppError.js';
import { now } from '../utils/clock.js';
import { atTime, toDateKey } from '../utils/date.js';

const MINUTE = 60_000;
const NO_SHOW_RATE = 0.05; // RN11 — 5% das senhas não são atendidas
const RECALL_RATE = 0.1; // clientes que só comparecem na segunda chamada
const TYPE_MIX = [
  ['SP', 0.2],
  ['SE', 0.25],
  ['SG', 0.55],
];

const uniform = (min, max, random) => min + (max - min) * random();

/** RN11 — tempo médio de atendimento (TM) de cada tipo, em milissegundos. */
export const serviceDuration = (type, random = Math.random) => {
  if (type === 'SP') return uniform(10, 20, random) * MINUTE; // 15 min ± 5
  if (type === 'SG') return uniform(2, 8, random) * MINUTE; // 5 min ± 3
  return (random() < 0.95 ? 1 : 5) * MINUTE; // SE: 1 min (95%) ou 5 min (5%)
};

const pickType = (random) => {
  let roll = random();
  for (const [type, share] of TYPE_MIX) {
    if ((roll -= share) < 0) return type;
  }
  return 'SG';
};

/**
 * Simula um dia completo de atendimento (simulação de eventos discretos):
 * chegadas aleatórias no expediente, guichês chamando pela regra de prioridade (RN03),
 * 5% de não comparecimento e tempos de atendimento conforme o TM.
 * Devolve as senhas já com todos os horários preenchidos, sem gravar nada.
 */
export const simulateTickets = ({ dateKey, total, counters, random = Math.random }) => {
  const open = atTime(dateKey, config.businessHours.open);
  const close = atTime(dateKey, config.businessHours.close);
  const lastArrival = close.getTime() - 30 * MINUTE;

  const sequences = { SP: 0, SE: 0, SG: 0 };
  const arrivals = Array.from({ length: total }, () => new Date(uniform(open.getTime(), lastArrival, random)))
    .sort((a, b) => a - b)
    .map((issuedAt) => {
      const type = pickType(random);
      const sequence = ++sequences[type];
      return {
        type, sequence, issuedAt,
        number: formatTicketNumber(issuedAt, type, sequence),
        status: STATUS.AGUARDANDO,
        events: [],
      };
    });

  const desks = counters.map((desk) => ({ ...desk, freeAt: open.getTime() }));
  let lastCalledType = null;

  for (;;) {
    const desk = desks.reduce((soonest, item) => (item.freeAt < soonest.freeAt ? item : soonest));
    const time = desk.freeAt;
    if (time >= close.getTime()) break;

    const waiting = arrivals.filter((t) => t.status === STATUS.AGUARDANDO && t.issuedAt.getTime() <= time);
    if (waiting.length === 0) {
      const upcoming = arrivals.find((t) => t.status === STATUS.AGUARDANDO && t.issuedAt.getTime() > time);
      desk.freeAt = upcoming ? upcoming.issuedAt.getTime() : close.getTime();
      continue;
    }

    const order = priorityOrder(lastCalledType);
    const ticket = order.map((type) => waiting.find((t) => t.type === type)).find(Boolean);
    lastCalledType = ticket.type;

    Object.assign(ticket, { counterId: desk.id, userId: desk.userId, firstCallAt: new Date(time) });
    ticket.events.push([STATUS.AGUARDANDO, STATUS.CHAMADA, time]);
    const roll = random();

    if (roll < NO_SHOW_RATE) {
      const recallAt = time + MINUTE;
      const closedAt = recallAt + MINUTE;
      Object.assign(ticket, { status: STATUS.NAO_COMPARECEU, secondCallAt: new Date(recallAt), closedAt: new Date(closedAt) });
      ticket.events.push([STATUS.CHAMADA, STATUS.CHAMADA_NOVAMENTE, recallAt], [STATUS.CHAMADA_NOVAMENTE, STATUS.NAO_COMPARECEU, closedAt]);
      desk.freeAt = closedAt;
      continue;
    }

    let from = STATUS.CHAMADA;
    let arrival = time + uniform(0.3, 1, random) * MINUTE;
    if (roll < NO_SHOW_RATE + RECALL_RATE) {
      const recallAt = time + MINUTE;
      ticket.secondCallAt = new Date(recallAt);
      ticket.events.push([STATUS.CHAMADA, STATUS.CHAMADA_NOVAMENTE, recallAt]);
      from = STATUS.CHAMADA_NOVAMENTE;
      arrival = recallAt + uniform(0.3, 1, random) * MINUTE;
    }
    const finishedAt = arrival + serviceDuration(ticket.type, random);
    Object.assign(ticket, { status: STATUS.ATENDIDA, startedAt: new Date(arrival), finishedAt: new Date(finishedAt) });
    ticket.events.push([from, STATUS.EM_ATENDIMENTO, arrival], [STATUS.EM_ATENDIMENTO, STATUS.ATENDIDA, finishedAt]);
    desk.freeAt = finishedAt;
  }

  // RN10 — o que sobrou na fila ao fim do expediente é descartado.
  for (const ticket of arrivals.filter((t) => t.status === STATUS.AGUARDANDO)) {
    Object.assign(ticket, { status: STATUS.DESCARTADA, closedAt: close });
    ticket.events.push([STATUS.AGUARDANDO, STATUS.DESCARTADA, close.getTime()]);
  }

  return { tickets: arrivals, sequences, lastCalledType };
};

export const simulationService = {
  /** Gera e grava um dia simulado (apenas datas passadas e sem senhas). */
  async simulateDay(dateKey, total = 150) {
    if (dateKey >= toDateKey(now())) {
      throw new AppError(400, 'A simulação só pode ser feita para dias anteriores a hoje.', 'DATA_INVALIDA');
    }
    if (!Number.isInteger(total) || total < 1 || total > 900) {
      throw new AppError(400, 'Quantidade de senhas deve estar entre 1 e 900.', 'QUANTIDADE_INVALIDA');
    }

    return withTransaction(async (db) => {
      if ((await ticketRepository.countByDate(db, dateKey)) > 0) {
        throw new AppError(409, `Já existem senhas em ${dateKey}.`, 'DIA_JA_POSSUI_SENHAS');
      }
      const counters = await counterRepository.list(db, { onlyActive: true });
      const users = (await userRepository.list(db)).filter((user) => user.active);
      if (counters.length === 0 || users.length === 0) {
        throw new AppError(409, 'Cadastre ao menos um guichê e um atendente ativos.', 'SEM_CADASTROS');
      }
      const desks = counters.map((counter, index) => ({ id: counter.id, userId: users[index % users.length].id }));
      const { tickets, sequences, lastCalledType } = simulateTickets({ dateKey, total, counters: desks });

      const events = [];
      for (const t of tickets) {
        const id = await ticketRepository.insert(db, {
          number: t.number, type: t.type, sequence: t.sequence, service_date: dateKey, status: t.status,
          issued_at: t.issuedAt, first_call_at: t.firstCallAt ?? null, second_call_at: t.secondCallAt ?? null,
          started_at: t.startedAt ?? null, finished_at: t.finishedAt ?? null, closed_at: t.closedAt ?? null,
          counter_id: t.counterId ?? null, user_id: t.userId ?? null,
        });
        events.push(
          [id, null, STATUS.EMITIDA, null, null, t.issuedAt],
          [id, STATUS.EMITIDA, STATUS.AGUARDANDO, null, null, t.issuedAt],
          ...t.events.map(([from, to, at]) => [id, from, to, t.userId ?? null, t.counterId ?? null, new Date(at)]),
        );
      }
      await db.query(
        'INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, created_at) VALUES ?',
        [events],
      );
      for (const [type, lastSeq] of Object.entries(sequences)) {
        if (lastSeq > 0) {
          await db.query('INSERT INTO ticket_sequences (service_date, type, last_seq) VALUES (?, ?, ?)', [dateKey, type, lastSeq]);
        }
      }
      await db.query('INSERT INTO call_control (service_date, last_called_type) VALUES (?, ?)', [dateKey, lastCalledType]);

      const count = (status) => tickets.filter((t) => t.status === status).length;
      return {
        date: dateKey,
        issued: tickets.length,
        attended: count(STATUS.ATENDIDA),
        noShow: count(STATUS.NAO_COMPARECEU),
        discarded: count(STATUS.DESCARTADA),
      };
    });
  },
};
