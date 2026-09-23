export const TICKET_TYPES = Object.freeze({
  SP: 'Prioritária',
  SE: 'Retirada de Exames',
  SG: 'Geral',
});

export const isTicketType = (type) => Object.hasOwn(TICKET_TYPES, type);

/**
 * RN03 — intercalação [SP] -> [SE|SG] -> [SP] -> [SE|SG].
 * Recebe o tipo da última senha chamada no dia e devolve a ordem de preferência
 * para a próxima chamada. Se a fila preferida estiver vazia, o próximo tipo da lista é usado (RN05).
 */
export const priorityOrder = (lastCalledType) =>
  lastCalledType === 'SP' ? ['SE', 'SG', 'SP'] : ['SP', 'SE', 'SG'];

/** RN02 — número no padrão YYMMDD-PPSQ, ex.: 260923-SP001. */
export const formatTicketNumber = (date, type, sequence) => {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}-${type}${String(sequence).padStart(3, '0')}`;
};

export const MAX_DAILY_SEQUENCE = 999;
