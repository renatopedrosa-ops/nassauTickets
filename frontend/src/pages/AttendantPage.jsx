import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert.jsx';
import { ConnectionBanner } from '../components/ConnectionBanner.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TicketBadge } from '../components/TicketBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { attendanceApi } from '../services/nassauApi.js';
import { formatTime } from '../utils/format.js';

// Quais ações ficam habilitadas em cada estado da senha ativa do guichê.
const ACTIONS_BY_STATUS = {
  NONE: ['callNext'],
  CHAMADA: ['recall', 'start'],
  CHAMADA_NOVAMENTE: ['start', 'noShow', 'callNext'],
  EM_ATENDIMENTO: ['finish'],
};

const ACTIONS = [
  { id: 'callNext', label: 'Chamar próxima', variant: 'primary' },
  { id: 'recall', label: 'Chamar novamente', variant: 'secondary' },
  { id: 'start', label: 'Iniciar atendimento', variant: 'success' },
  { id: 'finish', label: 'Finalizar atendimento', variant: 'success' },
  { id: 'noShow', label: 'Não compareceu', variant: 'danger' },
];

const SUCCESS_MESSAGES = {
  recall: 'Senha chamada novamente ("Última chamada").',
  start: 'Atendimento iniciado.',
  finish: 'Atendimento finalizado.',
  noShow: 'Não comparecimento registrado.',
};

export function AttendantPage() {
  const { user } = useAuth();
  const { data, online, lastUpdated, refresh } = usePolling(attendanceApi.current, 3000);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!user.counterId) {
    return (
      <Alert type="info">
        Você entrou sem guichê. Para atender, saia e faça login escolhendo um guichê, ou acesse a <Link to="/gestao">Gestão</Link>.
      </Alert>
    );
  }

  const ticket = data?.ticket ?? null;
  const queue = data?.queue;
  const allowed = ACTIONS_BY_STATUS[ticket?.status ?? 'NONE'] ?? [];

  const run = async (action) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await attendanceApi[action]();
      if (action === 'callNext') {
        const parts = [];
        if (result.abandoned) parts.push(`Senha ${result.abandoned.number} registrada como não compareceu.`);
        parts.push(result.ticket ? `Senha ${result.ticket.number} chamada.` : 'Não há senhas aguardando.');
        setMessage({ type: result.ticket ? 'success' : 'info', text: parts.join(' ') });
      } else {
        setMessage({ type: 'success', text: SUCCESS_MESSAGES[action] });
      }
      await refresh();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="attendant">
      <div className="page-header">
        <h1>Atendimento · {user.counterName}</h1>
        <p className="muted">Atendente: {user.name}</p>
      </div>

      <ConnectionBanner online={online} lastUpdated={lastUpdated} />
      <Alert type={message?.type} onClose={() => setMessage(null)}>{message?.text}</Alert>

      <div className="attendant__grid">
        <article className="card attendant__ticket" aria-live="polite">
          <h2>Senha atual</h2>
          {ticket ? (
            <>
              <strong className={`attendant__number type-${ticket.type}`}>{ticket.number}</strong>
              <p><TicketBadge type={ticket.type} withLabel /> <StatusBadge status={ticket.status} /></p>
              <dl className="details">
                <dt>Emitida</dt><dd>{formatTime(ticket.issuedAt)}</dd>
                <dt>1ª chamada</dt><dd>{formatTime(ticket.firstCallAt)}</dd>
                {ticket.secondCallAt && <><dt>2ª chamada</dt><dd>{formatTime(ticket.secondCallAt)}</dd></>}
                {ticket.startedAt && <><dt>Início</dt><dd>{formatTime(ticket.startedAt)}</dd></>}
              </dl>
            </>
          ) : (
            <p className="muted">Nenhuma senha no guichê. Clique em “Chamar próxima”.</p>
          )}

          <div className="actions">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`btn btn--${action.variant}`}
                disabled={busy || !online || !allowed.includes(action.id)}
                onClick={() => run(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
          {ticket?.status === 'CHAMADA_NOVAMENTE' && (
            <p className="muted small">Se o cliente não comparecer, “Chamar próxima” registra o não comparecimento automaticamente.</p>
          )}
        </article>

        <aside className="card">
          <h2>Fila de espera</h2>
          <div className="stats stats--column">
            <StatCard label="Prioritárias (SP)" value={queue?.SP ?? '—'} />
            <StatCard label="Retirada de exames (SE)" value={queue?.SE ?? '—'} />
            <StatCard label="Gerais (SG)" value={queue?.SG ?? '—'} />
          </div>
          <p className="muted small">A ordem de chamada é definida pelo sistema: SP → SE|SG → SP → SE|SG.</p>
        </aside>
      </div>
    </section>
  );
}
