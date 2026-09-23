import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStorage } from '../services/api.js';
import { authApi } from '../services/nassauApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()));

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // Restaura a sessão salva ao recarregar a página.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    authApi
      .me()
      .then(setUser)
      .catch((error) => { if (!error.isOffline) logout(); })
      .finally(() => setLoading(false));
  }, [logout]);

  // Token expirado em qualquer requisição -> volta para o login.
  useEffect(() => {
    window.addEventListener('nassau:unauthorized', logout);
    return () => window.removeEventListener('nassau:unauthorized', logout);
  }, [logout]);

  const login = useCallback(async (credentials) => {
    const { token, user: profile } = await authApi.login(credentials);
    tokenStorage.set(token);
    setUser(profile);
    return profile;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
