import { useCallback, useEffect, useState, type DependencyList } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: false }));
    loader()
      .then((data) => {
        if (active) setState({ data, loading: false, error: false });
      })
      .catch(() => {
        if (active) setState({ data: null, loading: false, error: true });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
