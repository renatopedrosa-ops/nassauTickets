// Testes de integração: usam um banco MySQL separado (nassau_tickets_test por padrão).
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'nassau_tickets_test';
process.env.ENFORCE_BUSINESS_HOURS = 'true';

const { initDatabase } = await import('../scripts/initDb.js');
const { pool } = await import('../src/db/pool.js');
const { ticketService } = await import('../src/services/ticketService.js');
const { dayCloseService } = await import('../src/services/dayCloseService.js');
const { setNow } = await import('../src/utils/clock.js');

const DAY = [2026, 8, 23];
const at = (hour, minute = 0) => new Date(...DAY, hour, minute);
const actor = (counterId) => ({ userId: 1, counterId });
const issueAll = async (types) => {
  for (const type of types) await ticketService.issue(type);
};
const callAndFinish = async (counterId) => {
  const { ticket } = await ticketService.callNext(actor(counterId));
  if (ticket) {
    await ticketService.start(actor(counterId));
    await ticketService.finish(actor(counterId));
  }
  return ticket;
};

before(async () => {
  await initDatabase({ reset: true, silent: true });
  for (let i = 4; i <= 10; i += 1) await pool.query('INSERT INTO counters (name) VALUES (?)', [`Guichê ${i}`]);
});

beforeEach(async () => {
  await pool.query('DELETE FROM ticket_events');
  await pool.query('DELETE FROM tickets');
  await pool.query('DELETE FROM ticket_sequences');
  await pool.query('DELETE FROM call_control');
  setNow(at(10));
});

after(async () => {
  setNow(null);
  await pool.end();
});

describe('Emissão (RF01/RF02)', () => {
  it('gera números sequenciais por tipo e deixa a senha AGUARDANDO', async () => {
    const a = await ticketService.issue('SG');
    const b = await ticketService.issue('SG');
    const c = await ticketService.issue('SP');
    assert.deepEqual([a.number, b.number, c.number], ['260923-SG001', '260923-SG002', '260923-SP001']);
    assert.equal(a.status, 'AGUARDANDO');
  });

  it('reinicia a sequência no dia seguinte', async () => {
    await ticketService.issue('SE');
    setNow(new Date(2026, 8, 24, 8));
    assert.equal((await ticketService.issue('SE')).number, '260924-SE001');
  });

  it('recusa emissão fora do expediente (RN01)', async () => {
    setNow(at(17, 0));
    await assert.rejects(ticketService.issue('SG'), { code: 'FORA_DO_EXPEDIENTE' });
    setNow(at(6, 59));
    await assert.rejects(ticketService.issue('SG'), { code: 'FORA_DO_EXPEDIENTE' });
  });

  it('registra EMITIDA e AGUARDANDO na auditoria', async () => {
    const ticket = await ticketService.issue('SP');
    const [events] = await pool.query('SELECT from_status, to_status FROM ticket_events WHERE ticket_id = ? ORDER BY id', [ticket.id]);
    assert.deepEqual(events.map((e) => e.to_status), ['EMITIDA', 'AGUARDANDO']);
  });
});

describe('Prioridade (RN03/RN05)', () => {
  it('intercala SP -> SE -> SP -> SG e usa a próxima fila quando uma está vazia', async () => {
    await issueAll(['SG', 'SG', 'SG', 'SE', 'SP', 'SP']);
    const order = [];
    for (let i = 0; i < 6; i += 1) order.push((await callAndFinish(1)).number.slice(7));
    assert.deepEqual(order, ['SP001', 'SE001', 'SP002', 'SG001', 'SG002', 'SG003']);
    assert.equal((await ticketService.callNext(actor(1))).ticket, null, 'fila vazia');
  });

  it('considera senhas emitidas entre um atendimento e outro', async () => {
    await issueAll(['SG', 'SG']);
    assert.equal((await callAndFinish(1)).type, 'SG');
    await ticketService.issue('SP');
    assert.equal((await callAndFinish(1)).type, 'SP');
    assert.equal((await callAndFinish(1)).type, 'SG');
  });
});

describe('Chamada, rechamada e não comparecimento (RN06/RN07/RN08)', () => {
  it('exige a segunda chamada antes de abandonar e marca NAO_COMPARECEU ao chamar a próxima', async () => {
    await issueAll(['SG', 'SG']);
    const { ticket: first } = await ticketService.callNext(actor(1));
    await assert.rejects(ticketService.callNext(actor(1)), { code: 'SENHA_CHAMADA_UMA_VEZ' });
    await assert.rejects(ticketService.noShow(actor(1)), { code: 'NAO_COMPARECEU_INVALIDO' });

    const recalled = await ticketService.recall(actor(1));
    assert.equal(recalled.status, 'CHAMADA_NOVAMENTE');
    await assert.rejects(ticketService.recall(actor(1)), { code: 'RECHAMADA_INVALIDA' });

    const result = await ticketService.callNext(actor(1));
    assert.equal(result.abandoned.id, first.id);
    assert.equal(result.abandoned.status, 'NAO_COMPARECEU');
    assert.equal(result.ticket.number, '260923-SG002');
  });

  it('não permite chamar a próxima com atendimento em andamento', async () => {
    await issueAll(['SG', 'SG']);
    await ticketService.callNext(actor(1));
    await ticketService.start(actor(1));
    await assert.rejects(ticketService.callNext(actor(1)), { code: 'ATENDIMENTO_EM_ANDAMENTO' });
  });

  it('permite finalizar um atendimento após as 17h (RN09)', async () => {
    await issueAll(['SP']);
    await ticketService.callNext(actor(1));
    await ticketService.start(actor(1));
    setNow(at(17, 20));
    assert.equal((await ticketService.finish(actor(1))).status, 'ATENDIDA');
  });

  it('o painel mostra as 5 últimas chamadas e nunca a próxima da fila', async () => {
    await issueAll(['SG', 'SG', 'SG', 'SG', 'SG', 'SG', 'SG']);
    for (let i = 0; i < 6; i += 1) {
      setNow(at(10, i + 1));
      await callAndFinish(1);
    }
    const panel = await ticketService.panel();
    assert.equal(panel.calls.length, 5);
    assert.equal(panel.calls[0].number, '260923-SG006');
    assert.ok(!panel.calls.some((call) => call.number === '260923-SG007'));
  });
});

describe('Concorrência (RN14)', () => {
  it('dez guichês chamando ao mesmo tempo nunca recebem a mesma senha', async () => {
    await issueAll(['SP', 'SP', 'SP', 'SE', 'SE', 'SG', 'SG', 'SG', 'SG', 'SG']);
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => ticketService.callNext(actor(i + 1))),
    );
    const numbers = results.map((result) => result.ticket?.number);
    assert.equal(new Set(numbers).size, 10, `senhas repetidas: ${numbers}`);
    assert.ok(numbers.every(Boolean));

    // As chamadas foram serializadas: a ordem real (eventos) continua respeitando a intercalação.
    const [rows] = await pool.query(
      `SELECT t.type FROM ticket_events e JOIN tickets t ON t.id = e.ticket_id
        WHERE e.to_status = 'CHAMADA' ORDER BY e.id`,
    );
    assert.deepEqual(rows.map((r) => r.type), ['SP', 'SE', 'SP', 'SE', 'SP', 'SG', 'SG', 'SG', 'SG', 'SG']);
  });

  it('emissões simultâneas geram sequências únicas', async () => {
    const tickets = await Promise.all(Array.from({ length: 20 }, () => ticketService.issue('SG')));
    assert.equal(new Set(tickets.map((t) => t.number)).size, 20);
  });
});

describe('Encerramento do expediente (RN10)', () => {
  it('descarta a fila após as 17h e preserva o atendimento em andamento', async () => {
    await issueAll(['SP', 'SG', 'SG']);
    await ticketService.callNext(actor(1));
    await ticketService.start(actor(1));

    setNow(at(16, 59));
    assert.deepEqual(await dayCloseService.closeStaleTickets(at(16, 59)), { discarded: 0, abandoned: 0 });

    const result = await dayCloseService.closeStaleTickets(at(17, 1));
    assert.deepEqual(result, { discarded: 2, abandoned: 0 });
    const [rows] = await pool.query('SELECT status, COUNT(*) AS total FROM tickets GROUP BY status ORDER BY status');
    assert.deepEqual(rows.map((r) => [r.status, Number(r.total)]), [['EM_ATENDIMENTO', 1], ['DESCARTADA', 2]]);
  });

  it('encerra chamadas de dias anteriores que nunca foram iniciadas', async () => {
    await issueAll(['SG']);
    await ticketService.callNext(actor(1));
    const result = await dayCloseService.closeStaleTickets(new Date(2026, 8, 24, 7, 5));
    assert.deepEqual(result, { discarded: 0, abandoned: 1 });
  });
});
