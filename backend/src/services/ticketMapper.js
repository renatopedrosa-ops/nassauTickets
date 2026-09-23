import { TICKET_TYPES } from '../domain/ticketTypes.js';

/** Converte a linha do banco (snake_case) no formato da API (camelCase). */
export const toTicketDto = (row) =>
  row && {
    id: row.id,
    number: row.number,
    type: row.type,
    typeLabel: TICKET_TYPES[row.type],
    status: row.status,
    serviceDate: row.service_date,
    issuedAt: row.issued_at,
    firstCallAt: row.first_call_at ?? null,
    secondCallAt: row.second_call_at ?? null,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    counterId: row.counter_id ?? null,
  };
