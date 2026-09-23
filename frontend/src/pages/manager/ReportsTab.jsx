import { useEffect, useState } from 'react';
import { Alert } from '../../components/Alert.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { StatCard } from '../../components/StatCard.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { TicketBadge } from '../../components/TicketBadge.jsx';
import { adminApi } from '../../services/nassauApi.js';
import { formatDateTime, formatDuration, formatPercent, formatTime, todayKey } from '../../utils/format.js';

const SECTIONS = [
  { id: 'summary', label: 'Resumo' },
  { id: 'detailed', label: 'Detalhado' },
  { id: 'audit', label: 'Auditoria' },
];

const byTypeColumns = [
  { key: 'type', header: 'Tipo', render: (row) => <TicketBadge type={row.type} withLabel /> },
  { key: 'issued', header: 'Emitidas' },
  { key: 'attended', header: 'Atendidas' },
  { key: 'noShow', header: 'Não compareceram' },
  { key: 'discarded', header: 'Descartadas' },
  { key: 'avgServiceSeconds', header: 'TM atendimento', render: (row) => formatDuration(row.avgServiceSeconds) },
  { key: 'avgWaitSeconds', header: 'TM espera', render: (row) => formatDuration(row.avgWaitSeconds) },
];

const byCounterColumns = [
  { key: 'counter', header: 'Guichê' },
  { key: 'attended', header: 'Atendidas' },
  { key: 'avgServiceSeconds', header: 'TM atendimento', render: (row) => formatDuration(row.avgServiceSeconds) },
];

const detailedColumns = [
  { key: 'number', header: 'Senha' },
  { key: 'type', header: 'Tipo', render: (row) => <TicketBadge type={row.type} /> },
  { key: 'status', header: 'Situação', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'issuedAt', header: 'Emissão', render: (row) => formatDateTime(row.issuedAt) },
  { key: 'attendedAt', header: 'Atendimento', render: (row) => formatDateTime(row.attendedAt) },
  { key: 'counter', header: 'Guichê', render: (row) => row.counter ?? '' },
];

const auditColumns = [
  { key: 'attendant', header: 'Atendente' },
  { key: 'counter', header: 'Guichê' },
  { key: 'number', header: 'Senha' },
  { key: 'firstCallAt', header: '1ª chamada', render: (row) => formatTime(row.firstCallAt) },
  { key: 'secondCallAt', header: '2ª chamada', render: (row) => formatTime(row.secondCallAt) },
  { key: 'startedAt', header: 'Início', render: (row) => formatTime(row.startedAt) },
  { key: 'finishedAt', header: 'Fim', render: (row) => formatTime(row.finishedAt) },
  { key: 'status', header: 'Situação', render: (row) => <StatusBadge status={row.status} /> },
];

/** Exporta uma lista de objetos para CSV (abre no Excel). */
const downloadCsv = (filename, rows) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.join(';'), ...rows.map((row) => headers.map((h) => escape(row[h])).join(';'))].join('\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
};

function HourChart({ data }) {
  const max = Math.max(1, ...data.map((item) => item.issued));
  return (
    <div className="bars" role="img" aria-label="Senhas emitidas por hora">
      {data.map((item) => (
        <div key={item.hour} className="bars__item" title={`${item.hour}h: ${item.issued} senhas`}>
          <span className="bars__value">{item.issued}</span>
          <span className="bars__bar" style={{ height: `${(item.issued / max) * 100}%` }} />
          <span className="bars__label">{item.hour}h</span>
        </div>
      ))}
    </div>
  );
}

export function ReportsTab() {
  const [kind, setKind] = useState('daily');
  const [date, setDate] = useState(todayKey());
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [section, setSection] = useState('summary');
  const [result, setResult] = useState({ key: null, report: null, error: '' });

  // A chave identifica a consulta atual; "carregando" é derivado dela, sem estado extra.
  const queryKey = kind === 'daily' ? `daily:${date}` : `monthly:${month}`;
  const loading = result.key !== queryKey;
  const { report, error } = result;

  useEffect(() => {
    let ignore = false; // evita aplicar a resposta de uma consulta antiga
    const request = kind === 'daily' ? adminApi.dailyReport(date) : adminApi.monthlyReport(month);
    request
      .then((data) => { if (!ignore) setResult({ key: queryKey, report: data, error: '' }); })
      .catch((err) => { if (!ignore) setResult({ key: queryKey, report: null, error: err.message }); });
    return () => { ignore = true; };
  }, [kind, date, month, queryKey]);

  const totals = report?.totals;
  const periodLabel = kind === 'daily' ? date : month;

  return (
    <div className="reports">
      <form className="toolbar" onSubmit={(event) => event.preventDefault()}>
        <label className="field field--inline">
          <span>Relatório</span>
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="daily">Diário</option>
            <option value="monthly">Mensal</option>
          </select>
        </label>
        {kind === 'daily' ? (
          <label className="field field--inline">
            <span>Dia</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
        ) : (
          <label className="field field--inline">
            <span>Mês</span>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
          </label>
        )}
        <button type="button" className="btn btn--ghost" onClick={() => window.print()}>Imprimir</button>
      </form>

      <Alert type="error">{error}</Alert>
      {loading && <p className="muted">Carregando relatório…</p>}

      {report && (
        <>
          <div className="stats">
            <StatCard label="Emitidas" value={totals.issued} />
            <StatCard label="Atendidas" value={totals.attended} hint={formatPercent(report.indicators.attendanceRate)} />
            <StatCard label="Não compareceram" value={totals.noShow} hint={formatPercent(report.indicators.noShowRate)} />
            <StatCard label="Descartadas" value={totals.discarded} hint={formatPercent(report.indicators.discardRate)} />
            <StatCard label="TM de atendimento" value={formatDuration(totals.avgServiceSeconds)} />
            <StatCard label="TM de espera" value={formatDuration(totals.avgWaitSeconds)} />
          </div>

          <div className="tabs tabs--small" role="tablist" aria-label="Seções do relatório">
            {SECTIONS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={section === item.id}
                className={`tabs__tab ${section === item.id ? 'is-active' : ''}`} onClick={() => setSection(item.id)}>
                {item.label}
              </button>
            ))}
          </div>

          {section === 'summary' && (
            <div className="report-grid">
              <div className="card">
                <h3>Emitidas e atendidas por prioridade</h3>
                <DataTable columns={byTypeColumns} rows={report.byType} rowKey="type" />
              </div>
              <div className="card">
                <h3>Desempenho por guichê</h3>
                <DataTable columns={byCounterColumns} rows={report.byCounter} rowKey="counter" />
              </div>
              <div className="card">
                <h3>Emissões por hora</h3>
                {report.byHour.length ? <HourChart data={report.byHour} /> : <p className="muted">Sem emissões.</p>}
              </div>
            </div>
          )}

          {section === 'detailed' && (
            <div className="card">
              <div className="card__header">
                <h3>Relatório detalhado ({report.detailed.length})</h3>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => downloadCsv(`detalhado-${periodLabel}.csv`, report.detailed)}>Exportar CSV</button>
              </div>
              <DataTable columns={detailedColumns} rows={report.detailed} rowKey="number" />
            </div>
          )}

          {section === 'audit' && (
            <div className="card">
              <div className="card__header">
                <h3>Auditoria ({report.audit.length})</h3>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => downloadCsv(`auditoria-${periodLabel}.csv`, report.audit)}>Exportar CSV</button>
              </div>
              <DataTable columns={auditColumns} rows={report.audit} rowKey="number" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
