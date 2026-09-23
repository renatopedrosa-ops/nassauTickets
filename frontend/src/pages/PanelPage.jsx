import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConnectionBanner } from '../components/ConnectionBanner.jsx';
import { Logo } from '../components/Logo.jsx';
import { buildAnnouncement, useSpeech } from '../hooks/useSpeech.js';
import { usePolling } from '../hooks/usePolling.js';
import { publicApi } from '../services/nassauApi.js';
import { shortNumber } from '../utils/format.js';

const callKey = (call) => `${call.id}-${call.callCount}`;

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <time className="panel__clock">{now.toLocaleTimeString('pt-BR')}</time>;
}

export function PanelPage() {
  const { data, online, lastUpdated } = usePolling(publicApi.panel, 2000);
  const speech = useSpeech();
  const { speak } = speech;
  const seenRef = useRef(null);
  const calls = data?.calls ?? [];
  const [current, ...history] = calls;

  // Anuncia por voz apenas as chamadas novas (ou rechamadas) desde a última atualização.
  useEffect(() => {
    if (!data) return;
    const keys = data.calls.map(callKey);
    if (seenRef.current === null) {
      seenRef.current = new Set(keys); // primeira carga: não repete o histórico
      return;
    }
    const fresh = data.calls.filter((call) => !seenRef.current.has(callKey(call))).reverse();
    fresh.forEach((call) => speak(buildAnnouncement(call)));
    seenRef.current = new Set(keys);
  }, [data, speak]);

  return (
    <div className="kiosk panel">
      <header className="kiosk__header">
        <Logo size={40} />
        <div className="panel__tools">
          {speech.supported && !speech.enabled && (
            <button type="button" className="btn btn--light" onClick={speech.enable}>🔊 Ativar som</button>
          )}
          <Clock />
          <Link to="/" className="kiosk__back">Início</Link>
        </div>
      </header>

      <ConnectionBanner online={online} lastUpdated={lastUpdated} />

      <div className="panel__grid">
        <section className="panel__current" aria-live="polite" aria-atomic="true">
          {current ? (
            <>
              {current.callCount > 1 && <p className="panel__last-call">Última chamada</p>}
              <p className="panel__label">Senha</p>
              <strong key={callKey(current)} className={`panel__number type-${current.type}`}>
                {shortNumber(current.number)}
              </strong>
              <p className="panel__type">{current.typeLabel}</p>
              <p className="panel__label">Dirija-se ao</p>
              <strong className="panel__counter">{current.counterName}</strong>
            </>
          ) : (
            <p className="panel__empty">{data ? 'Aguardando a primeira chamada do dia' : 'Carregando…'}</p>
          )}
        </section>

        <section className="panel__history" aria-label="Senhas chamadas anteriormente">
          <h2>Últimas chamadas</h2>
          <ol>
            {history.map((call) => (
              <li key={callKey(call)}>
                <span className={`panel__history-number type-${call.type}`}>{shortNumber(call.number)}</span>
                <span>{call.counterName}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
