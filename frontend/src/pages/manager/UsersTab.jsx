import { useCallback, useEffect, useState } from 'react';
import { Alert } from '../../components/Alert.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { adminApi } from '../../services/nassauApi.js';

const EMPTY_FORM = { name: '', username: '', password: '', role: 'ATENDENTE' };

export function UsersTab() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => adminApi.users().then(setUsers).catch((err) => setMessage({ type: 'error', text: err.message })), []);
  useEffect(() => { load(); }, [load]);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await adminApi.createUser(form);
      setForm(EMPTY_FORM);
      setMessage({ type: 'success', text: 'Atendente cadastrado.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const update = async (user, fields, text) => {
    try {
      await adminApi.updateUser(user.id, fields);
      setMessage({ type: 'success', text });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const resetPassword = (user) => {
    const password = window.prompt(`Nova senha para ${user.username} (mínimo 6 caracteres):`);
    if (password) update(user, { password }, 'Senha alterada.');
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'username', header: 'Usuário' },
    { key: 'role', header: 'Perfil', render: (user) => (user.role === 'GESTOR' ? 'Gestor' : 'Atendente') },
    { key: 'active', header: 'Situação', render: (user) => (user.active ? 'Ativo' : 'Inativo') },
    {
      key: 'actions',
      header: 'Ações',
      render: (user) => (
        <div className="row-actions">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => update(user, { active: !user.active }, 'Situação atualizada.')}>
            {user.active ? 'Desativar' : 'Ativar'}
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => update(user, { role: user.role === 'GESTOR' ? 'ATENDENTE' : 'GESTOR' }, 'Perfil atualizado.')}>
            {user.role === 'GESTOR' ? 'Tornar atendente' : 'Tornar gestor'}
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => resetPassword(user)}>Nova senha</button>
        </div>
      ),
    },
  ];

  return (
    <div className="crud">
      <Alert type={message?.type} onClose={() => setMessage(null)}>{message?.text}</Alert>
      <form className="card form form--grid" onSubmit={handleSubmit}>
        <h2>Novo atendente</h2>
        <label className="field"><span>Nome</span><input name="name" value={form.name} onChange={handleChange} required /></label>
        <label className="field"><span>Usuário</span><input name="username" value={form.username} onChange={handleChange} required /></label>
        <label className="field"><span>Senha</span><input name="password" type="password" minLength={6} value={form.password} onChange={handleChange} required /></label>
        <label className="field">
          <span>Perfil</span>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="ATENDENTE">Atendente</option>
            <option value="GESTOR">Gestor</option>
          </select>
        </label>
        <button type="submit" className="btn btn--primary">Cadastrar</button>
      </form>
      <div className="card">
        <DataTable columns={columns} rows={users} caption="Atendentes cadastrados" />
      </div>
    </div>
  );
}
