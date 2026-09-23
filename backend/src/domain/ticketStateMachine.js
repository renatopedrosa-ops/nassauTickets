import { AppError } from '../utils/AppError.js';

export const STATUS = Object.freeze({
  EMITIDA: 'EMITIDA',
  AGUARDANDO: 'AGUARDANDO',
  CHAMADA: 'CHAMADA',
  CHAMADA_NOVAMENTE: 'CHAMADA_NOVAMENTE',
  EM_ATENDIMENTO: 'EM_ATENDIMENTO',
  ATENDIDA: 'ATENDIDA',
  NAO_COMPARECEU: 'NAO_COMPARECEU',
  DESCARTADA: 'DESCARTADA',
});

// Cada estado lista para onde pode ir. Estados finais não têm saída.
const TRANSITIONS = Object.freeze({
  EMITIDA: ['AGUARDANDO', 'DESCARTADA'],
  AGUARDANDO: ['CHAMADA', 'DESCARTADA'],
  // CHAMADA -> NAO_COMPARECEU só é usada pelo encerramento automático de dias anteriores.
  CHAMADA: ['CHAMADA_NOVAMENTE', 'EM_ATENDIMENTO', 'NAO_COMPARECEU'],
  CHAMADA_NOVAMENTE: ['EM_ATENDIMENTO', 'NAO_COMPARECEU'],
  EM_ATENDIMENTO: ['ATENDIDA'],
  ATENDIDA: [],
  NAO_COMPARECEU: [],
  DESCARTADA: [],
});

/** Estados em que a senha ocupa um guichê (RN08). */
export const ACTIVE_STATUSES = Object.freeze([
  STATUS.CHAMADA,
  STATUS.CHAMADA_NOVAMENTE,
  STATUS.EM_ATENDIMENTO,
]);

export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;

export const assertTransition = (from, to) => {
  if (!canTransition(from, to)) {
    throw new AppError(409, `Transição inválida: ${from} → ${to}.`, 'TRANSICAO_INVALIDA');
  }
};
