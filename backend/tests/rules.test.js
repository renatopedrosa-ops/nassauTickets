import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isWithinBusinessHours } from '../src/domain/businessHours.js';
import { canTransition } from '../src/domain/ticketStateMachine.js';
import { formatTicketNumber, priorityOrder } from '../src/domain/ticketTypes.js';
import { buildReport } from '../src/services/reportService.js';
import { serviceDuration, simulateTickets } from '../src/services/simulationService.js';

describe('RN02 — numeração YYMMDD-PPSQ', () => {
  it('formata ano, mês, dia, tipo e sequência com 3 dígitos', () => {
    assert.equal(formatTicketNumber(new Date(2026, 8, 3, 10), 'SP', 7), '260903-SP007');
    assert.equal(formatTicketNumber(new Date(2026, 11, 31, 10), 'SG', 123), '261231-SG123');
  });
});

describe('RN03 — intercalação [SP] -> [SE|SG]', () => {
  it('começa o dia pela SP', () => assert.deepEqual(priorityOrder(null), ['SP', 'SE', 'SG']));
  it('após SP prefere SE, depois SG', () => assert.deepEqual(priorityOrder('SP'), ['SE', 'SG', 'SP']));
  it('após SE ou SG volta para SP', () => {
    assert.deepEqual(priorityOrder('SE'), ['SP', 'SE', 'SG']);
    assert.deepEqual(priorityOrder('SG'), ['SP', 'SE', 'SG']);
  });
});

describe('Máquina de estados', () => {
  it('permite o caminho feliz', () => {
    const path = ['EMITIDA', 'AGUARDANDO', 'CHAMADA', 'CHAMADA_NOVAMENTE', 'EM_ATENDIMENTO', 'ATENDIDA'];
    path.slice(1).forEach((to, index) => assert.ok(canTransition(path[index], to), `${path[index]} -> ${to}`));
  });
  it('bloqueia transições inválidas', () => {
    assert.equal(canTransition('AGUARDANDO', 'ATENDIDA'), false);
    assert.equal(canTransition('ATENDIDA', 'CHAMADA'), false);
    assert.equal(canTransition('EM_ATENDIMENTO', 'NAO_COMPARECEU'), false);
    assert.equal(canTransition('CHAMADA_NOVAMENTE', 'CHAMADA_NOVAMENTE'), false);
  });
});

describe('RN01 — expediente', () => {
  const hours = { open: 7, close: 17, enforce: true };
  it('aceita 7h00 e 16h59', () => {
    assert.ok(isWithinBusinessHours(new Date(2026, 8, 23, 7, 0), hours));
    assert.ok(isWithinBusinessHours(new Date(2026, 8, 23, 16, 59), hours));
  });
  it('recusa 6h59 e 17h00', () => {
    assert.equal(isWithinBusinessHours(new Date(2026, 8, 23, 6, 59), hours), false);
    assert.equal(isWithinBusinessHours(new Date(2026, 8, 23, 17, 0), hours), false);
  });
});

describe('RN11 — simulação', () => {
  it('respeita os limites do TM de cada tipo', () => {
    for (let i = 0; i < 500; i += 1) {
      const sp = serviceDuration('SP') / 60_000;
      const sg = serviceDuration('SG') / 60_000;
      const se = serviceDuration('SE') / 60_000;
      assert.ok(sp >= 10 && sp <= 20);
      assert.ok(sg >= 2 && sg <= 8);
      assert.ok(se === 1 || se === 5);
    }
  });

  it('gera cerca de 5% de não comparecimento e intercala SP com SE/SG', () => {
    const { tickets } = simulateTickets({
      dateKey: '2026-09-01',
      total: 4000,
      counters: Array.from({ length: 60 }, (_, i) => ({ id: i + 1, userId: 1 })),
    });
    const noShow = tickets.filter((t) => t.status === 'NAO_COMPARECEU').length / tickets.length;
    assert.ok(noShow > 0.03 && noShow < 0.07, `taxa de não comparecimento: ${noShow}`);

    // Duas SP seguidas só são permitidas se não havia SE/SG aguardando no momento da 2ª chamada.
    const calls = tickets.filter((t) => t.firstCallAt).sort((a, b) => a.firstCallAt - b.firstCallAt);
    const waitingAt = (time, type) =>
      tickets.some((t) => t.type === type && t.issuedAt <= time && (!t.firstCallAt || t.firstCallAt > time));
    for (let i = 1; i < calls.length; i += 1) {
      if (calls[i - 1].type === 'SP' && calls[i].type === 'SP') {
        const time = calls[i].firstCallAt;
        assert.ok(!waitingAt(time, 'SE') && !waitingAt(time, 'SG'), `SP seguida de SP em ${time}`);
      }
    }
    assert.equal(new Set(tickets.map((t) => t.number)).size, tickets.length, 'números únicos');
  });
});

describe('Relatórios', () => {
  const at = (h, m) => new Date(2026, 8, 23, h, m);
  const rows = [
    { number: 'A', type: 'SP', status: 'ATENDIDA', issued_at: at(8, 0), first_call_at: at(8, 10), started_at: at(8, 11), finished_at: at(8, 26), counter_name: 'G1', user_name: 'Ana' },
    { number: 'B', type: 'SG', status: 'ATENDIDA', issued_at: at(8, 5), first_call_at: at(8, 30), started_at: at(8, 30), finished_at: at(8, 35), counter_name: 'G1', user_name: 'Ana' },
    { number: 'C', type: 'SG', status: 'NAO_COMPARECEU', issued_at: at(9, 0), first_call_at: at(9, 5), second_call_at: at(9, 6), counter_name: 'G2', user_name: 'Bia' },
    { number: 'D', type: 'SE', status: 'DESCARTADA', issued_at: at(16, 50) },
  ];
  const report = buildReport(rows, { kind: 'daily', from: '2026-09-23', to: '2026-09-23' });

  it('conta emitidas e atendidas no geral e por tipo', () => {
    assert.equal(report.totals.issued, 4);
    assert.equal(report.totals.attended, 2);
    assert.deepEqual(report.byType.map((t) => [t.type, t.issued, t.attended]), [['SP', 1, 1], ['SE', 1, 0], ['SG', 2, 1]]);
  });
  it('calcula o tempo médio de atendimento', () => {
    assert.equal(report.totals.avgServiceSeconds, 600); // (15 min + 5 min) / 2
  });
  it('deixa em branco o atendimento de senhas não atendidas', () => {
    const c = report.detailed.find((row) => row.number === 'C');
    assert.equal(c.attendedAt, null);
    assert.equal(c.counter, null);
  });
  it('audita apenas senhas chamadas, com as duas chamadas', () => {
    assert.equal(report.audit.length, 3);
    assert.deepEqual(report.audit.find((row) => row.number === 'C').secondCallAt, at(9, 6));
  });
});
