import { withTransaction, pool } from '../db/pool.js';
import { isWithinBusinessHours } from '../domain/businessHours.js';
import { assertTransition, STATUS } from '../domain/ticketStateMachine.js';
import {
  formatTicketNumber, isTicketType, MAX_DAILY_SEQUENCE, priorityOrder, TICKET_TYPES,
} from '../domain/ticketTypes.js';
import { eventRepository } from '../repositories/eventRepository.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { AppError } from '../utils/AppError.js';
import { now } from '../utils/clock.js';
import { toDateKey } from '../utils/date.js';
import { toTicketDto } from './ticketMapper.js';

const assertOpen = (at) => {
  if (!isWithinBusinessHours(at)) {
    throw new AppError(409, 'Fora do horário de expediente (7h às 17h).', 'FORA_DO_EXPEDIENTE');
  }
};

/** Aplica uma transição da máquina de estados e registra o evento de auditoria. */
export const applyTransition = async (db, ticket, toStatus, { at, userId = null, counterId = null, fields = {} }) => {
  assertTransition(ticket.status, toStatus);
  await ticketRepository.update(db, ticket.id, { status: toStatus, ...fields });
  await eventRepository.insert(db, {
    ticketId: ticket.id,
    fromStatus: ticket.status,
    toStatus,
    userId,
    counterId: counterId ?? ticket.counter_id ?? null,
    at,
  });
  return { ...ticket, status: toStatus, ...fields };
};

/** Busca (com trava) a senha ativa do guichê ou falha com uma mensagem amigável. */
const requireActive = async (db, counterId) => {
  const ticket = await ticketRepository.findActiveByCounter(db, counterId, { forUpdate: true });
  if (!ticket) throw new AppError(404, 'Nenhuma senha chamada neste guichê.', 'SEM_SENHA_ATIVA');
  return ticket;
};

export const ticketService = {
  /** RF01/RF02 — emissão no totem. */
  async issue(type) {
    if (!isTicketType(type)) {
      throw new AppError(400, 'Tipo de senha inválido. Use SP, SG ou SE.', 'TIPO_INVALIDO');
    }
    const at = now();
    assertOpen(at);
    const serviceDate = toDateKey(at);

    const ticket = await withTransaction(async (db) => {
      const sequence = await ticketRepository.nextSequence(db, serviceDate, type);
      if (sequence > MAX_DAILY_SEQUENCE) {
        throw new AppError(409, `Limite diário de senhas ${type} atingido.`, 'LIMITE_DIARIO');
      }
      const created = {
        number: formatTicketNumber(at, type, sequence),
        type,
        sequence,
        service_date: serviceDate,
        status: STATUS.EMITIDA,
        issued_at: at,
      };
      created.id = await ticketRepository.insert(db, created);
      await eventRepository.insert(db, { ticketId: created.id, toStatus: STATUS.EMITIDA, at });
      return applyTransition(db, created, STATUS.AGUARDANDO, { at });
    });

    return toTicketDto(ticket);
  },

  /** Senha ativa do guichê (chamada ou em atendimento). */
  async current(counterId) {
    return toTicketDto(await ticketRepository.findActiveByCounter(pool, counterId));
  },

  /**
   * RF05 — chama a próxima senha para o guichê.
   * Concorrência (RN14): a linha do dia em `call_control` é travada com SELECT ... FOR UPDATE,
   * então duas chamadas simultâneas são processadas uma após a outra e nunca recebem a mesma senha.
   * Essa trava é sempre a PRIMEIRA a ser obtida (ordem única de travas evita deadlock).
   */
  async callNext({ userId, counterId }) {
    const at = now();
    assertOpen(at);
    const serviceDate = toDateKey(at);
    await ticketRepository.ensureCallControl(pool, serviceDate);

    return withTransaction(async (db) => {
      const lastCalledType = await ticketRepository.lockCallControl(db, serviceDate);
      const active = await ticketRepository.findActiveByCounter(db, counterId, { forUpdate: true });
      let abandoned = null;

      if (active?.status === STATUS.EM_ATENDIMENTO) {
        throw new AppError(409, 'Finalize o atendimento atual antes de chamar a próxima senha.', 'ATENDIMENTO_EM_ANDAMENTO');
      }
      if (active?.status === STATUS.CHAMADA) {
        throw new AppError(409, 'Inicie o atendimento ou chame novamente a senha atual antes de passar para a próxima.', 'SENHA_CHAMADA_UMA_VEZ');
      }
      if (active?.status === STATUS.CHAMADA_NOVAMENTE) {
        // RN06 — após duas chamadas sem comparecimento, a senha é abandonada.
        abandoned = await applyTransition(db, active, STATUS.NAO_COMPARECEU, {
          at, userId, counterId, fields: { closed_at: at },
        });
      }

      const next = await ticketRepository.pickNextWaiting(db, serviceDate, priorityOrder(lastCalledType));
      if (!next) return { ticket: null, abandoned: toTicketDto(abandoned) };

      const called = await applyTransition(db, next, STATUS.CHAMADA, {
        at, userId, counterId,
        fields: { first_call_at: at, counter_id: counterId, user_id: userId },
      });
      await ticketRepository.setLastCalledType(db, serviceDate, called.type);
      return { ticket: toTicketDto(called), abandoned: toTicketDto(abandoned) };
    });
  },

  /** RF06 — "Chamar novamente" (permitido uma única vez, RN07). */
  async recall({ userId, counterId }) {
    const at = now();
    return withTransaction(async (db) => {
      const ticket = await requireActive(db, counterId);
      if (ticket.status !== STATUS.CHAMADA) {
        throw new AppError(409, 'Esta senha não pode ser chamada novamente.', 'RECHAMADA_INVALIDA');
      }
      const updated = await applyTransition(db, ticket, STATUS.CHAMADA_NOVAMENTE, {
        at, userId, counterId, fields: { second_call_at: at },
      });
      return toTicketDto(updated);
    });
  },

  /** RF07 — cliente compareceu: inicia o atendimento. */
  async start({ userId, counterId }) {
    const at = now();
    return withTransaction(async (db) => {
      const ticket = await requireActive(db, counterId);
      const updated = await applyTransition(db, ticket, STATUS.EM_ATENDIMENTO, {
        at, userId, counterId, fields: { started_at: at },
      });
      return toTicketDto(updated);
    });
  },

  /** RF08 — finaliza o atendimento (vale mesmo após as 17h, RN09). */
  async finish({ userId, counterId }) {
    const at = now();
    return withTransaction(async (db) => {
      const ticket = await requireActive(db, counterId);
      const updated = await applyTransition(db, ticket, STATUS.ATENDIDA, {
        at, userId, counterId, fields: { finished_at: at },
      });
      return toTicketDto(updated);
    });
  },

  /** RF09 — registra o não comparecimento após a segunda chamada (RN06). */
  async noShow({ userId, counterId }) {
    const at = now();
    return withTransaction(async (db) => {
      const ticket = await requireActive(db, counterId);
      if (ticket.status !== STATUS.CHAMADA_NOVAMENTE) {
        throw new AppError(409, 'Chame a senha novamente antes de registrar o não comparecimento.', 'NAO_COMPARECEU_INVALIDO');
      }
      const updated = await applyTransition(db, ticket, STATUS.NAO_COMPARECEU, {
        at, userId, counterId, fields: { closed_at: at },
      });
      return toTicketDto(updated);
    });
  },

  /** RF10 — 5 últimas senhas chamadas. A próxima senha da fila nunca é exposta. */
  async panel() {
    const at = now();
    const rows = await ticketRepository.listRecentCalls(pool, toDateKey(at), 5);
    return {
      serverTime: at,
      calls: rows.map((row) => ({
        id: row.id,
        number: row.number,
        type: row.type,
        typeLabel: TICKET_TYPES[row.type],
        status: row.status,
        counterName: row.counter_name,
        callCount: row.second_call_at ? 2 : 1,
        lastCallAt: row.last_call_at,
      })),
    };
  },

  /** Quantidade de senhas aguardando por tipo (sem revelar qual é a próxima). */
  async queueSummary() {
    const rows = await ticketRepository.countWaitingByType(pool, toDateKey(now()));
    const summary = { SP: 0, SE: 0, SG: 0 };
    for (const row of rows) summary[row.type] = Number(row.total);
    return { ...summary, total: summary.SP + summary.SE + summary.SG };
  },
};
