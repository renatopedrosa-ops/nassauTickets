import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert } from '../components/Alert.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { publicApi } from '../services/nassauApi.js';

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '', counterId: '' });
  const [counters, setCounters] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    publicApi.counters().then(setCounters).catch(() => setError('Não foi possível carregar os guichês.'));
  }, []);

  // Único ponto de redirecionamento: após o login, o usuário vai para onde tentou entrar
  // ou, por padrão, para o atendimento (com guichê) ou para a gestão (sem guichê).
  if (user) {
    const home = user.counterId ? '/atendimento' : '/gestao';
    const from = location.state?.from;
    const canUseFrom = from && !(from === '/atendimento' && !user.counterId);
    return <Navigate to={canUseFrom ? from : home} replace />;
  }

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login({ ...form, counterId: form.counterId ? Number(form.counterId) : null });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <section className="auth">
      <form className="card form" onSubmit={handleSubmit}>
        <h1>Acesso do atendente</h1>
        <Alert type="error">{error}</Alert>

        <label className="field">
          <span>Usuário</span>
          <input name="username" autoComplete="username" value={form.username} onChange={handleChange} required autoFocus />
        </label>
        <label className="field">
          <span>Senha</span>
          <input name="password" type="password" autoComplete="current-password" value={form.password} onChange={handleChange} required />
        </label>
        <label className="field">
          <span>Guichê</span>
          <select name="counterId" value={form.counterId} onChange={handleChange}>
            <option value="">Sem guichê (somente gestão)</option>
            {counters.map((counter) => <option key={counter.id} value={counter.id}>{counter.name}</option>)}
          </select>
        </label>

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="muted small">Usuários de demonstração: <code>atendente / atendente123</code> e <code>gestor / gestor123</code>.</p>
      </form>
    </section>
  );
}
