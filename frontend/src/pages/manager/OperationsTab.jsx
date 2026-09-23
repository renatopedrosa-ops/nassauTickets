import { useState } from 'react';
import { Alert } from '../../components/Alert.jsx';
import { adminApi } from '../../services/nassauApi.js';
import { yesterdayKey } from '../../utils/format.js';

export function OperationsTab() {
  const [date, setDate] = useState(yesterdayKey());
  const [tickets, setTickets] = useState(150);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const execute = async (operation) => {
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ type: 'success', text: await operation() });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const simulate = (event) => {
    event.preventDefault();
    execute(async () => {
      const r = await adminApi.simulate(date, Number(tickets));
      return `Dia ${r.date} simulado: ${r.issued} emitidas, ${r.attended} atendidas, ${r.noShow} não compareceram, ${r.discarded} descartadas.`;
    });
  };

  const closeDay = () =>
    execute(async () => {
      const r = await adminApi.closeDay();
      return `Encerramento executado: ${r.discarded} senha(s) descartada(s) e ${r.abandoned} abandonada(s).`;
    });

  return (
    <div className="crud">
      <Alert type={message?.type} onClose={() => setMessage(null)}>{message?.text}</Alert>

      <form className="card form form--inline" onSubmit={simulate}>
        <div>
          <h2>Simular dia de atendimento</h2>
          <p className="muted small">Gera um dia completo (7h–17h) com as regras de prioridade, TM de cada tipo e ~5% de não comparecimento. Apenas para dias passados sem senhas.</p>
        </div>
        <label className="field"><span>Dia</span><input type="date" value={date} max={yesterdayKey()} onChange={(event) => setDate(event.target.value)} required /></label>
        <label className="field"><span>Senhas</span><input type="number" min={1} max={900} value={tickets} onChange={(event) => setTickets(event.target.value)} required /></label>
        <button type="submit" className="btn btn--primary" disabled={busy}>Simular</button>
      </form>

      <div className="card form form--inline">
        <div>
          <h2>Encerrar expediente</h2>
          <p className="muted small">O sistema faz isso automaticamente às 17h. Descarta as senhas que ficaram na fila; atendimentos em andamento continuam até serem finalizados.</p>
        </div>
        <button type="button" className="btn btn--danger" onClick={closeDay} disabled={busy}>Encerrar agora</button>
      </div>
    </div>
  );
}
