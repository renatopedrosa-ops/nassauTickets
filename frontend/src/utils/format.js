export const TICKET_TYPES = {
  SP: { label: 'Prioritária', short: 'SP' },
  SE: { label: 'Retirada de Exames', short: 'SE' },
  SG: { label: 'Geral', short: 'SG' },
};

export const STATUS_LABELS = {
  EMITIDA: 'Emitida',
  AGUARDANDO: 'Aguardando',
  CHAMADA: 'Chamada',
  CHAMADA_NOVAMENTE: 'Chamada novamente',
  EM_ATENDIMENTO: 'Em atendimento',
  ATENDIDA: 'Atendida',
  NAO_COMPARECEU: 'Não compareceu',
  DESCARTADA: 'Descartada',
};

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

export const formatTime = (value) => (value ? timeFormat.format(new Date(value)) : '');
export const formatDateTime = (value) => (value ? dateTimeFormat.format(new Date(value)) : '');

export const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}min ${String(seconds % 60).padStart(2, '0')}s`;
};

export const formatPercent = (ratio) => `${(ratio * 100).toFixed(1)}%`;

/** "260923-SP001" -> "SP001": forma curta exibida no painel. */
export const shortNumber = (number) => number?.split('-')[1] ?? number;

const pad = (n) => String(n).padStart(2, '0');
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
