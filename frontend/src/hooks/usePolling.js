import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_BACKOFF_MS = 15000;

/**
 * Busca dados periodicamente (useEffect + setTimeout).
 * Se o servidor falhar, mantém os últimos dados conhecidos, marca `online = false`
 * e tenta de novo com intervalo crescente (recuperação de falhas, RNF04).
 */
export function usePolling(fetcher, intervalMs = 2000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const fetcherRef = useRef(fetcher);
  const timerRef = useRef(null);
  const failuresRef = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const load = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      setOnline(true);
      setLastUpdated(new Date());
      failuresRef.current = 0;
    } catch (err) {
      setError(err);
      if (err.isOffline) {
        setOnline(false);
        failuresRef.current += 1;
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      await load();
      if (cancelled) return;
      const delay = Math.min(intervalMs * 2 ** failuresRef.current, MAX_BACKOFF_MS);
      timerRef.current = setTimeout(tick, delay);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
  }, [load, intervalMs]);

  return { data, error, online, lastUpdated, refresh: load };
}
