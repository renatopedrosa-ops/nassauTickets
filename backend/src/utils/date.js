const pad = (value, size = 2) => String(value).padStart(size, '0');

/** Data local no formato YYYY-MM-DD (coluna service_date). */
export const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Converte 'YYYY-MM-DD' + hora/minuto em Date local. */
export const atTime = (dateKey, hours, minutes = 0, seconds = 0) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
};

export const isValidDateKey = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && !Number.isNaN(atTime(value, 0).getTime());

export const isValidMonthKey = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? '');

/** Primeiro e último dia de um mês 'YYYY-MM'. */
export const monthRange = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const last = new Date(year, month, 0).getDate();
  return { from: `${monthKey}-01`, to: `${monthKey}-${pad(last)}` };
};

export const secondsBetween = (start, end) =>
  start && end ? Math.round((new Date(end) - new Date(start)) / 1000) : null;
