import { useState, useEffect, useCallback, useMemo } from 'react';

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

  const storageKey = useMemo(() => `form_${formKey}`, [formKey]);
  const storageAPI = useMemo(() => storage === 'localStorage' ? localStorage : sessionStorage, [storage]);

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
        // Mark that persisted data was found
      }
    } catch (error) {
      // Failed to load persisted form data - silently continue
    } finally {
      setIsLoaded(true);
    }
  }, [formKey, storage, storageKey, excludeFields, storageAPI]);

  // Debounced save function
  const saveToStorage = useCallback((dataToSave) => {
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
        // Form data persisted successfully
      }
    } catch (error) {
      // Failed to persist form data - silently continue
    }
  }, [storageKey, excludeFields, storageAPI]);

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
      // Persisted form data cleared
    } catch (error) {
      // Failed to clear persisted data - silently continue
    }
  }, [storageKey, storageAPI]);

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
