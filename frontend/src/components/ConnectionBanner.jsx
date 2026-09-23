import { formatTime } from '../utils/format.js';

/** Aviso exibido quando o backend/banco não responde (RNF04). */
export function ConnectionBanner({ online, lastUpdated }) {
  if (online) return null;
  return (
    <div className="alert alert--warning" role="status">
      <strong>Sem conexão com o servidor.</strong> Tentando reconectar automaticamente…
      {lastUpdated && <> Exibindo dados de {formatTime(lastUpdated)}.</>}
    </div>
  );
}
