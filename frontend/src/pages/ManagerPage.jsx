import { useState } from 'react';
import { CountersTab } from './manager/CountersTab.jsx';
import { OperationsTab } from './manager/OperationsTab.jsx';
import { ReportsTab } from './manager/ReportsTab.jsx';
import { UsersTab } from './manager/UsersTab.jsx';

const TABS = [
  { id: 'reports', label: 'Relatórios', Component: ReportsTab },
  { id: 'users', label: 'Atendentes', Component: UsersTab },
  { id: 'counters', label: 'Guichês', Component: CountersTab },
  { id: 'operations', label: 'Operações', Component: OperationsTab },
];

export function ManagerPage() {
  const [active, setActive] = useState('reports');
  const { Component } = TABS.find((tab) => tab.id === active);

  return (
    <section>
      <div className="page-header">
        <h1>Gestão</h1>
      </div>
      <div className="tabs" role="tablist" aria-label="Áreas da gestão">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={`tabs__tab ${active === tab.id ? 'is-active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="tabs__panel">
        <Component />
      </div>
    </section>
  );
}
