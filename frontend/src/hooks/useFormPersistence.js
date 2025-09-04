import { useState, useEffect, useCallback } from 'react';

const useFormPersistence = (formKey, initialValues = {}, options = {}) => {
  const {
    storage = 'sessionStorage', // 'localStorage' or 'sessionStorage'
    excludeFields = [], // Fields to exclude from persistence
    clearOnSubmit = true, // Clear persisted data on successful submit
    debounceMs = 500, // Debounce time for saving
  } = options;

  const [values, setValues] = useState(initialValues);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasPersistedData, setHasPersistedData] = useState(false);

  const storageKey = `form_${formKey}`;
  const storageAPI = storage === 'localStorage' ? localStorage : sessionStorage;

  // Load persisted data on mount
  useEffect(() => {
    try {
      const persistedData = storageAPI.getItem(storageKey);
      if (persistedData) {
        const parsedData = JSON.parse(persistedData);

        // Merge with initial values, excluding sensitive fields
        const filteredData = Object.keys(parsedData).reduce((acc, key) => {
          if (!excludeFields.includes(key)) {
            acc[key] = parsedData[key];
          }
          return acc;
        }, {});

        setValues(prev => ({ ...prev, ...filteredData }));
        setHasPersistedData(true);
        console.log('📥 Form data restored from', storage, ':', Object.keys(filteredData));
        console.log('🔍 hasPersistedData set to true');
      }
    } catch (error) {
      console.warn('Failed to load persisted form data:', error);
    } finally {
      setIsLoaded(true);
    }
  }, [formKey, storage, storageKey]);

  // Debounced save function
  const saveToStorage = useCallback(
    debounce(dataToSave => {
      try {
        // Filter out excluded fields and empty values
        const filteredData = Object.keys(dataToSave).reduce((acc, key) => {
          if (!excludeFields.includes(key) && dataToSave[key] !== '') {
            acc[key] = dataToSave[key];
          }
          return acc;
        }, {});

        if (Object.keys(filteredData).length > 0) {
          storageAPI.setItem(storageKey, JSON.stringify(filteredData));
          console.log('💾 Form data persisted to', storage);
        }
      } catch (error) {
        console.warn('Failed to persist form data:', error);
      }
    }, debounceMs),
    [storageKey, excludeFields, debounceMs]
  );

  // Update values and persist
  const updateValues = useCallback(
    newValues => {
      setValues(prev => {
        const updated = { ...prev, ...newValues };
        saveToStorage(updated);
        return updated;
      });
    },
    [saveToStorage]
  );

  // Handle individual field changes
  const handleChange = useCallback(
    e => {
      const { name, value } = e.target;
      updateValues({ [name]: value });
    },
    [updateValues]
  );

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    try {
      storageAPI.removeItem(storageKey);
      setHasPersistedData(false);
      console.log('🗑️ Persisted form data cleared');
    } catch (error) {
      console.warn('Failed to clear persisted data:', error);
    }
  }, [storageKey]);

  // Clear on successful submit
  const handleSubmitSuccess = useCallback(() => {
    if (clearOnSubmit) {
      clearPersistedData();
    }
  }, [clearOnSubmit, clearPersistedData]);

  return {
    values,
    isLoaded,
    handleChange,
    updateValues,
    clearPersistedData,
    handleSubmitSuccess,
    hasPersistedData,
  };
};

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default useFormPersistence;
