import { useState, useEffect, useCallback } from 'react';

const useFormPersistence = (formKey, initialValues = {}, options = {}) => {
  const {
    storage = 'localStorage', // 'localStorage' or 'sessionStorage'
    debounceMs = 500,
    excludeFields = [],
    encryptSensitive = true,
    sensitiveFields = ['password', 'confirmPassword', 'token', 'secret']
  } = options;

  const [values, setValues] = useState(initialValues);
  const [isLoading, setIsLoading] = useState(true);

  // Get storage instance
  const getStorage = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return storage === 'sessionStorage' ? window.sessionStorage : window.localStorage;
  }, [storage]);

  // Generate storage key
  const getStorageKey = useCallback(() => {
    return `floworx_form_${formKey}`;
  }, [formKey]);

  // Simple encryption for sensitive fields (base64 encoding)
  const encryptValue = useCallback((value) => {
    if (!encryptSensitive || typeof value !== 'string') return value;
    try {
      return btoa(value);
    } catch {
      return value;
    }
  }, [encryptSensitive]);

  // Simple decryption for sensitive fields
  const decryptValue = useCallback((value) => {
    if (!encryptSensitive || typeof value !== 'string') return value;
    try {
      return atob(value);
    } catch {
      return value;
    }
  }, [encryptSensitive]);

  // Load persisted data from storage
  const loadPersistedData = useCallback(() => {
    const storageInstance = getStorage();
    if (!storageInstance) return initialValues;

    try {
      const stored = storageInstance.getItem(getStorageKey());
      if (!stored) return initialValues;

      const parsedData = JSON.parse(stored);
      const decryptedData = {};

      // Decrypt sensitive fields
      Object.keys(parsedData).forEach(key => {
        if (sensitiveFields.includes(key)) {
          decryptedData[key] = decryptValue(parsedData[key]);
        } else {
          decryptedData[key] = parsedData[key];
        }
      });

      return { ...initialValues, ...decryptedData };
    } catch (error) {
      console.warn('Failed to load persisted form data:', error);
      return initialValues;
    }
  }, [getStorage, getStorageKey, initialValues, sensitiveFields, decryptValue]);

  // Save data to storage
  const saveToStorage = useCallback((data) => {
    const storageInstance = getStorage();
    if (!storageInstance) return;

    try {
      // Filter out excluded fields
      const filteredData = {};
      Object.keys(data).forEach(key => {
        if (!excludeFields.includes(key)) {
          if (sensitiveFields.includes(key)) {
            filteredData[key] = encryptValue(data[key]);
          } else {
            filteredData[key] = data[key];
          }
        }
      });

      storageInstance.setItem(getStorageKey(), JSON.stringify(filteredData));
    } catch (error) {
      console.warn('Failed to save form data to storage:', error);
    }
  }, [getStorage, getStorageKey, excludeFields, sensitiveFields, encryptValue]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    const storageInstance = getStorage();
    if (!storageInstance) return;

    try {
      storageInstance.removeItem(getStorageKey());
    } catch (error) {
      console.warn('Failed to clear persisted form data:', error);
    }
  }, [getStorage, getStorageKey]);

  // Update form values
  const updateValues = useCallback((newValues) => {
    setValues(prev => {
      const updated = { ...prev, ...newValues };
      
      // Debounced save to storage
      const timeoutId = setTimeout(() => {
        saveToStorage(updated);
      }, debounceMs);

      // Clear previous timeout
      if (updateValues.timeoutId) {
        clearTimeout(updateValues.timeoutId);
      }
      updateValues.timeoutId = timeoutId;

      return updated;
    });
  }, [saveToStorage, debounceMs]);

  // Update single field
  const updateField = useCallback((fieldName, value) => {
    updateValues({ [fieldName]: value });
  }, [updateValues]);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    clearPersistedData();
  }, [initialValues, clearPersistedData]);

  // Check if form has persisted data
  const hasPersistedData = useCallback(() => {
    const storageInstance = getStorage();
    if (!storageInstance) return false;

    try {
      const stored = storageInstance.getItem(getStorageKey());
      return !!stored;
    } catch {
      return false;
    }
  }, [getStorage, getStorageKey]);

  // Load persisted data on mount
  useEffect(() => {
    const persistedData = loadPersistedData();
    setValues(persistedData);
    setIsLoading(false);
  }, [loadPersistedData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateValues.timeoutId) {
        clearTimeout(updateValues.timeoutId);
      }
    };
  }, []);

  // Auto-save current values when they change
  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveToStorage(values);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    }
  }, [values, isLoading, saveToStorage, debounceMs]);

  return {
    values,
    isLoading,
    updateValues,
    updateField,
    resetForm,
    clearPersistedData,
    hasPersistedData: hasPersistedData(),
    
    // Helper methods for form integration
    getFieldProps: (fieldName) => ({
      value: values[fieldName] || '',
      onChange: (e) => {
        const value = e.target ? e.target.value : e;
        updateField(fieldName, value);
      }
    }),

    // Batch update multiple fields
    setFields: (fields) => {
      updateValues(fields);
    },

    // Get current form state
    getFormState: () => ({
      values,
      hasChanges: JSON.stringify(values) !== JSON.stringify(initialValues),
      hasPersistedData: hasPersistedData()
    })
  };
};

export default useFormPersistence;
