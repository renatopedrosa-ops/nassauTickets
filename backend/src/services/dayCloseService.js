import { withTransaction } from '../db/pool.js';
import { isAfterClosing } from '../domain/businessHours.js';
import { STATUS } from '../domain/ticketStateMachine.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { now } from '../utils/clock.js';
import { toDateKey } from '../utils/date.js';
import { applyTransition } from './ticketService.js';

const WAITING = [STATUS.EMITIDA, STATUS.AGUARDANDO];

export const dayCloseService = {
  /**
   * RN10 — descarta as senhas que ficaram na fila ao fim do expediente
   * e encerra como NAO_COMPARECEU as chamadas de dias anteriores que nunca foram iniciadas.
   * Atendimentos EM_ATENDIMENTO não são tocados: o atendente deve finalizá-los (RN09).
   */
  async closeStaleTickets(at = now()) {
    const today = toDateKey(at);
    const yesterday = toDateKey(new Date(at.getFullYear(), at.getMonth(), at.getDate() - 1));
    const discardUpTo = isAfterClosing(at) ? today : yesterday;

    return withTransaction(async (db) => {
      const tickets = await ticketRepository.findToClose(db, discardUpTo, yesterday);
      const result = { discarded: 0, abandoned: 0 };
      for (const ticket of tickets) {
        const toStatus = WAITING.includes(ticket.status) ? STATUS.DESCARTADA : STATUS.NAO_COMPARECEU;
        await applyTransition(db, ticket, toStatus, { at, fields: { closed_at: at } });
        result[toStatus === STATUS.DESCARTADA ? 'discarded' : 'abandoned'] += 1;
      }
      return result;
    });
  },
};
