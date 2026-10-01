import { useCallback, useEffect, useMemo, useState } from 'react';
import { TauriTextInputAdapter } from '../../../adapters/TauriTextInputAdapter';

export function useDirectInsertPermission() {
  const tauriTextInput = useMemo(() => new TauriTextInputAdapter(), []);
  const [supportsDirectInsert, setSupportsDirectInsert] = useState(false);
  const [hasDirectInsertPermission, setHasDirectInsertPermission] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const methods = await tauriTextInput.getSupportedMethods();
      setSupportsDirectInsert(methods.includes('direct'));
    } catch {
      setSupportsDirectInsert(false);
    }

    try {
      const permitted = await tauriTextInput.hasDirectInsertionPermission();
      setHasDirectInsertPermission(permitted);
    } catch {
      setHasDirectInsertPermission(false);
    }
  }, [tauriTextInput]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    try {
      await tauriTextInput.requestDirectInsertionPermission();
    } finally {
      setTimeout(() => void refresh(), 800);
      setTimeout(() => void refresh(), 2500);
    }
  }, [refresh, tauriTextInput]);

  return {
    supportsDirectInsert,
    hasDirectInsertPermission,
    requestPermission,
    refresh,
  };
}

