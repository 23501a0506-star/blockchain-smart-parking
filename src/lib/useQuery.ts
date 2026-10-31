import { useCallback, useEffect, useRef, useState } from 'react';

export interface QueryState<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Lightweight data-fetching hook with polling. A deliberately small substitute
 * for react-query so the project stays dependency-light (Vite + Tailwind +
 * lucide-react only). Polls every `refetchMs` for live slot/transaction updates.
 */
export function useQuery<T>(queryFn: () => Promise<T>, deps: unknown[] = [], refetchMs = 8000): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const fnRef = useRef(queryFn);
  fnRef.current = queryFn;

  const load = useCallback(async () => {
    try {
      const result = await fnRef.current();
      setData(result);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    (async () => {
      try {
        const result = await fnRef.current();
        if (active) {
          setData(result);
          setError(undefined);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    const interval = setInterval(async () => {
      try {
        const result = await fnRef.current();
        if (active) {
          setData(result);
          setError(undefined);
        }
      } catch {
        /* swallow polling errors */
      }
    }, refetchMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, isLoading, error, refetch: load };
}
