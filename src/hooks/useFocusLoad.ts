import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useDb } from '../data/DatabaseProvider';
import type { Db } from '../data/types';

// `loader` must be referentially stable (wrap in useCallback) to avoid refetch loops.
export function useFocusLoad<T>(loader: (db: Db) => Promise<T>) {
  const db = useDb();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      setData(await loader(db));
      setError(false);
    } catch {
      setError(true);
    }
  }, [db, loader]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, error, reload };
}
