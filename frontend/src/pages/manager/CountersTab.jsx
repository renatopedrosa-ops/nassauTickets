import { useCallback, useEffect, useState } from 'react';
import { Alert } from '../../components/Alert.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { adminApi } from '../../services/nassauApi.js';

export function CountersTab() {
  const [counters, setCounters] = useState([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState(null);

  const load = useCallback(() => adminApi.counters().then(setCounters).catch((err) => setMessage({ type: 'error', text: err.message })), []);
  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await adminApi.createCounter({ name });
      setName('');
      setMessage({ type: 'success', text: 'Guichê cadastrado.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const update = async (counter, fields) => {
    try {
      await adminApi.updateCounter(counter.id, fields);
      setMessage({ type: 'success', text: 'Guichê atualizado.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const rename = (counter) => {
    const newName = window.prompt('Novo nome do guichê:', counter.name);
    if (newName && newName !== counter.name) update(counter, { name: newName });
  };

  const columns = [
    { key: 'name', header: 'Guichê' },
    { key: 'active', header: 'Situação', render: (counter) => (counter.active ? 'Ativo' : 'Inativo') },
    {
      key: 'actions',
      header: 'Ações',
      render: (counter) => (
        <div className="row-actions">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => rename(counter)}>Renomear</button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => update(counter, { active: !counter.active })}>
            {counter.active ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="crud">
      <Alert type={message?.type} onClose={() => setMessage(null)}>{message?.text}</Alert>
      <form className="card form form--inline" onSubmit={handleSubmit}>
        <label className="field"><span>Nome do novo guichê</span><input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Guichê 04" /></label>
        <button type="submit" className="btn btn--primary">Cadastrar</button>
      </form>
      <div className="card">
        <DataTable columns={columns} rows={counters} caption="Guichês cadastrados" />
      </div>
    </div>
  );
}
