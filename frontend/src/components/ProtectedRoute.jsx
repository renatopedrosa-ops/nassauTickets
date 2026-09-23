import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Libera a rota apenas para usuários autenticados (e, opcionalmente, com o perfil exigido). */
export function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="muted">Carregando sessão…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) {
    return <div className="alert alert--error">Acesso restrito ao perfil {role.toLowerCase()}.</div>;
  }
  return children;
}
