// Cliente HTTP único da aplicação: base URL, token, timeout e tratamento de erros.
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
const TIMEOUT_MS = 8000;
const TOKEN_KEY = 'nassau.token';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'ERRO' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }

  /** true quando o backend ou o banco estão fora do ar (RNF04). */
  get isOffline() {
    return this.status === 0 || this.status === 503 || this.status >= 502;
  }
}

export const tokenStorage = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (token) => {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* armazenamento indisponível */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* armazenamento indisponível */ }
  },
};

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? tokenStorage.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError('Sem conexão com o servidor.', { status: 0, code: 'SEM_CONEXAO' });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event('nassau:unauthorized'));
    throw new ApiError(data?.message ?? 'Não foi possível concluir a operação.', {
      status: response.status,
      code: data?.error,
    });
  }
  return data;
}
