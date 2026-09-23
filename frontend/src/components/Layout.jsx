import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from './Logo.jsx';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Sair leva direto ao login, sem guardar a página anterior como destino.
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="layout">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="topbar">
        <Link to="/" aria-label="Página inicial"><Logo /></Link>
        <nav aria-label="Navegação principal" className="topbar__nav">
          <NavLink to="/totem">Totem</NavLink>
          <NavLink to="/painel">Painel</NavLink>
          <NavLink to="/atendimento">Atendimento</NavLink>
          {user?.role === 'GESTOR' && <NavLink to="/gestao">Gestão</NavLink>}
        </nav>
        {user && (
          <div className="topbar__user">
            <span>{user.name}{user.counterName ? ` · ${user.counterName}` : ''}</span>
            <button type="button" className="btn btn--ghost btn--small" onClick={handleLogout}>Sair</button>
          </div>
        )}
      </header>
      <main id="conteudo" className="container">
        <Outlet />
      </main>
    </div>
  );
}
