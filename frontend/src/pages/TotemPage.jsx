import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo.jsx';
import { publicApi } from '../services/nassauApi.js';
import { formatDateTime } from '../utils/format.js';

const OPTIONS = [
  { type: 'SP', title: 'Prioritária', text: 'Idosos, gestantes, lactantes, pessoas com deficiência ou com criança de colo' },
  { type: 'SE', title: 'Retirada de Exames', text: 'Retirar resultados de exames' },
  { type: 'SG', title: 'Geral', text: 'Coleta e demais atendimentos' },
];
const RESET_AFTER_MS = 10000;

export function TotemPage() {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  // Após exibir a senha, o totem volta sozinho para a tela inicial.
  useEffect(() => {
    if (!ticket) return undefined;
    const timer = setTimeout(() => setTicket(null), RESET_AFTER_MS);
    return () => clearTimeout(timer);
  }, [ticket]);

  const issue = async (type) => {
    setSending(true);
    setError('');
    try {
      setTicket(await publicApi.issueTicket(type));
    } catch (err) {
      setError(err.isOffline
        ? 'Sistema temporariamente indisponível. Por favor, dirija-se à recepção.'
        : err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="kiosk totem">
      <header className="kiosk__header">
        <Logo size={40} />
        <Link to="/" className="kiosk__back">Início</Link>
      </header>

      {ticket ? (
        <section className="ticket-printed" aria-live="assertive">
          <p>Sua senha é</p>
          <strong className={`ticket-printed__number type-${ticket.type}`}>{ticket.number.split('-')[1]}</strong>
          <p className="ticket-printed__full">{ticket.number} · {ticket.typeLabel}</p>
          <p className="muted">Emitida em {formatDateTime(ticket.issuedAt)}</p>
          <p>Aguarde a chamada no painel.</p>
          <button type="button" className="btn btn--primary btn--large" onClick={() => setTicket(null)}>Concluir</button>
        </section>
      ) : (
        <section>
          <h1 className="totem__title">Toque para retirar sua senha</h1>
          {error && <div className="alert alert--error totem__error" role="alert">{error}</div>}
          <div className="totem__options">
            {OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                className={`totem__button type-${option.type}`}
                onClick={() => issue(option.type)}
                disabled={sending}
              >
                <span className="totem__code">{option.type}</span>
                <span className="totem__name">{option.title}</span>
                <span className="totem__desc">{option.text}</span>
              </button>
            ))}
          </div>
          <p className="muted totem__privacy">Nenhum dado pessoal é solicitado (LGPD).</p>
        </section>
      )}
    </div>
  );
}
