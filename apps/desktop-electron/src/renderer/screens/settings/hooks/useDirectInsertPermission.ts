import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTaikApi } from '../../../platform/taik';

export function useDirectInsertPermission() {
  const api = useMemo(() => getTaikApi(), []);
  const [supportsDirectInsert, setSupportsDirectInsert] = useState(true);
  const [hasDirectInsertPermission, setHasDirectInsertPermission] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const permitted = await api.accessibility.checkSystemEvents();
      setHasDirectInsertPermission(permitted);
    } catch {
      setHasDirectInsertPermission(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    try {
      // Triggering this call will prompt for Accessibility access on macOS.
      await api.accessibility.checkSystemEvents(true);
    } finally {
      setTimeout(() => void refresh(), 800);
      setTimeout(() => void refresh(), 2500);
    }
  }, [api, refresh]);

  return {
    supportsDirectInsert,
    hasDirectInsertPermission,
    requestPermission,
    refresh,
  };
}
