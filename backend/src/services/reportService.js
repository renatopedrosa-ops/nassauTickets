import { pool } from '../db/pool.js';
import { STATUS } from '../domain/ticketStateMachine.js';
import { TICKET_TYPES } from '../domain/ticketTypes.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { secondsBetween } from '../utils/date.js';

const average = (values) => {
  const valid = values.filter((value) => value !== null);
  return valid.length ? Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length) : null;
};

const ratio = (part, total) => (total ? Number((part / total).toFixed(4)) : 0);

const serviceSeconds = (row) => secondsBetween(row.started_at, row.finished_at);
const waitSeconds = (row) => secondsBetween(row.issued_at, row.first_call_at);
const wasServed = (row) => row.status === STATUS.ATENDIDA || row.status === STATUS.EM_ATENDIMENTO;

const summarize = (rows) => {
  const attended = rows.filter((row) => row.status === STATUS.ATENDIDA);
  return {
    issued: rows.length,
    attended: attended.length,
    noShow: rows.filter((row) => row.status === STATUS.NAO_COMPARECEU).length,
    discarded: rows.filter((row) => row.status === STATUS.DESCARTADA).length,
    pending: rows.filter((row) => ![STATUS.ATENDIDA, STATUS.NAO_COMPARECEU, STATUS.DESCARTADA].includes(row.status)).length,
    avgServiceSeconds: average(attended.map(serviceSeconds)),
    avgWaitSeconds: average(rows.map(waitSeconds)),
  };
};

const groupBy = (rows, keyOf) =>
  rows.reduce((groups, row) => {
    const key = keyOf(row);
    (groups[key] ??= []).push(row);
    return groups;
  }, {});

export const buildReport = (rows, period) => {
  const totals = summarize(rows);

  const byType = Object.keys(TICKET_TYPES).map((type) => ({
    type,
    label: TICKET_TYPES[type],
    ...summarize(rows.filter((row) => row.type === type)),
  }));

  const served = rows.filter((row) => row.status === STATUS.ATENDIDA);
  const byCounter = Object.entries(groupBy(served, (row) => row.counter_name)).map(([counter, list]) => ({
    counter,
    attended: list.length,
    avgServiceSeconds: average(list.map(serviceSeconds)),
  }));

  const byHour = Object.entries(groupBy(rows, (row) => new Date(row.issued_at).getHours()))
    .map(([hour, list]) => ({ hour: Number(hour), issued: list.length }))
    .sort((a, b) => a.hour - b.hour);

  // Relatório detalhado: campos de atendimento em branco para senhas não atendidas.
  const detailed = rows.map((row) => ({
    number: row.number,
    type: row.type,
    status: row.status,
    issuedAt: row.issued_at,
    attendedAt: wasServed(row) ? row.started_at : null,
    counter: wasServed(row) ? row.counter_name : null,
  }));

  const audit = rows
    .filter((row) => row.first_call_at)
    .map((row) => ({
      attendant: row.user_name,
      counter: row.counter_name,
      number: row.number,
      status: row.status,
      firstCallAt: row.first_call_at,
      secondCallAt: row.second_call_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    }));

  return {
    period,
    totals,
    byType,
    byCounter,
    byHour,
    indicators: {
      attendanceRate: ratio(totals.attended, totals.issued),
      noShowRate: ratio(totals.noShow, totals.issued),
      discardRate: ratio(totals.discarded, totals.issued),
    },
    detailed,
    audit,
  };
};

export const reportService = {
  async daily(date) {
    const rows = await ticketRepository.listForReport(pool, date, date);
    return buildReport(rows, { kind: 'daily', from: date, to: date });
  },

  async monthly({ from, to, month }) {
    const rows = await ticketRepository.listForReport(pool, from, to);
    return buildReport(rows, { kind: 'monthly', month, from, to });
  },
};
