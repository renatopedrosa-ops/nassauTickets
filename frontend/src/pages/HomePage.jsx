import { Link } from 'react-router-dom';

const AREAS = [
  { to: '/totem', title: 'Totem', agent: 'Agente Cliente', text: 'Emissão anônima de senhas SP, SE e SG.' },
  { to: '/painel', title: 'Painel de chamadas', agent: 'Agente Sistema', text: 'Últimas 5 senhas chamadas, com anúncio por voz.' },
  { to: '/atendimento', title: 'Atendimento', agent: 'Agente Atendente', text: 'Chamar, rechamar, iniciar e finalizar atendimentos.' },
  { to: '/gestao', title: 'Gestão', agent: 'Gestor', text: 'Relatórios diário e mensal, auditoria e cadastros.' },
];

export function HomePage() {
  return (
    <section>
      <h1>Controle de Atendimento</h1>
      <p className="lead">Laboratório de Análises Clínicas — escolha a área do sistema.</p>
      <div className="cards">
        {AREAS.map((area) => (
          <Link key={area.to} to={area.to} className="card card--link">
            <span className="card__eyebrow">{area.agent}</span>
            <h2>{area.title}</h2>
            <p>{area.text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
