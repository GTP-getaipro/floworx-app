import { useCallback, useRef } from 'react';

const KEY_PREFIX = "floworx:";

export default function useFormPersistence(storageKey) {
  const debounceRef = useRef(null);
  const fullKey = KEY_PREFIX + storageKey;

  const load = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(fullKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load persisted data:', error);
      return null;
    }
  }, [fullKey]);

  const save = useCallback((obj) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(fullKey, JSON.stringify(obj));
      } catch (error) {
        console.warn('Failed to save persisted data:', error);
      }
    }, 300);
  }, [fullKey]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(fullKey);
    } catch (error) {
      console.warn('Failed to clear persisted data:', error);
    }
  }, [fullKey]);

  return { load, save, clear };
}
