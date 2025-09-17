import { useEffect } from 'react';

// Simple placeholder hook for form persistence
const useFormPersistence = (values, options = {}) => {
  const { 
    excludeFields = [], 
    storage = 'localStorage',
    debounceMs = 300,
    key = 'form-data'
  } = options;

  useEffect(() => {
    // Load persisted data on mount
    try {
      const storageObj = storage === 'sessionStorage' ? sessionStorage : localStorage;
      const saved = storageObj.getItem(key);
      if (saved) {
        const parsedData = JSON.parse(saved);
        // You would typically merge this with initial values
        console.log('Loaded persisted form data:', parsedData);
      }
    } catch (error) {
      console.warn('Failed to load persisted form data:', error);
    }
  }, [key, storage]);

  useEffect(() => {
    // Save data when values change (with debounce)
    const timeoutId = setTimeout(() => {
      try {
        const storageObj = storage === 'sessionStorage' ? sessionStorage : localStorage;
        const dataToSave = { ...values };
        
        // Remove excluded fields
        excludeFields.forEach(field => {
          delete dataToSave[field];
        });
        
        storageObj.setItem(key, JSON.stringify(dataToSave));
      } catch (error) {
        console.warn('Failed to persist form data:', error);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [values, excludeFields, storage, debounceMs, key]);

  return {
    clearPersistedData: () => {
      try {
        const storageObj = storage === 'sessionStorage' ? sessionStorage : localStorage;
        storageObj.removeItem(key);
      } catch (error) {
        console.warn('Failed to clear persisted form data:', error);
      }
    }
  };
};

export default useFormPersistence;
