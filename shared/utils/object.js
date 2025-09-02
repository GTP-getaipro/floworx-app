/**
 * Object Utilities for FloWorx SaaS
 * Common object manipulation and processing functions
 */

/**
 * Deep clone an object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
  return obj;
};

/**
 * Deep merge objects
 */
const deepMerge = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
};

/**
 * Check if value is an object
 */
const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Check if object is empty
 */
const isEmpty = (obj) => {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Get nested property value safely
 */
const get = (obj, path, defaultValue = undefined) => {
  if (!obj || !path) return defaultValue;
  
  const keys = Array.isArray(path) ? path : path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined || !(key in result)) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result;
};

/**
 * Set nested property value safely
 */
const set = (obj, path, value) => {
  if (!obj || !path) return obj;
  
  const keys = Array.isArray(path) ? path : path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || !isObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
};

/**
 * Remove property from object
 */
const unset = (obj, path) => {
  if (!obj || !path) return obj;
  
  const keys = Array.isArray(path) ? path : path.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const key of keys) {
    if (!(key in current) || !isObject(current[key])) {
      return obj;
    }
    current = current[key];
  }
  
  delete current[lastKey];
  return obj;
};

/**
 * Pick specific properties from object
 */
const pick = (obj, keys) => {
  if (!obj || !Array.isArray(keys)) return {};
  
  const result = {};
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  
  return result;
};

/**
 * Omit specific properties from object
 */
const omit = (obj, keys) => {
  if (!obj) return {};
  
  const keysToOmit = Array.isArray(keys) ? keys : [keys];
  const result = {};
  
  Object.keys(obj).forEach(key => {
    if (!keysToOmit.includes(key)) {
      result[key] = obj[key];
    }
  });
  
  return result;
};

/**
 * Transform object keys
 */
const mapKeys = (obj, transformer) => {
  if (!obj || typeof transformer !== 'function') return obj;
  
  const result = {};
  Object.keys(obj).forEach(key => {
    const newKey = transformer(key);
    result[newKey] = obj[key];
  });
  
  return result;
};

/**
 * Transform object values
 */
const mapValues = (obj, transformer) => {
  if (!obj || typeof transformer !== 'function') return obj;
  
  const result = {};
  Object.keys(obj).forEach(key => {
    result[key] = transformer(obj[key], key);
  });
  
  return result;
};

/**
 * Filter object by predicate
 */
const filterObject = (obj, predicate) => {
  if (!obj || typeof predicate !== 'function') return {};
  
  const result = {};
  Object.keys(obj).forEach(key => {
    if (predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  });
  
  return result;
};

/**
 * Flatten nested object
 */
const flatten = (obj, prefix = '', separator = '.') => {
  if (!obj || typeof obj !== 'object') return {};
  
  const result = {};
  
  Object.keys(obj).forEach(key => {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;
    
    if (isObject(obj[key])) {
      Object.assign(result, flatten(obj[key], newKey, separator));
    } else {
      result[newKey] = obj[key];
    }
  });
  
  return result;
};

/**
 * Unflatten object
 */
const unflatten = (obj, separator = '.') => {
  if (!obj || typeof obj !== 'object') return {};
  
  const result = {};
  
  Object.keys(obj).forEach(key => {
    set(result, key.split(separator), obj[key]);
  });
  
  return result;
};

/**
 * Compare two objects for equality
 */
const isEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

/**
 * Get object differences
 */
const diff = (obj1, obj2) => {
  const changes = {};
  
  // Check for added/changed properties
  Object.keys(obj2).forEach(key => {
    if (!(key in obj1)) {
      changes[key] = { type: 'added', value: obj2[key] };
    } else if (!isEqual(obj1[key], obj2[key])) {
      changes[key] = { type: 'changed', oldValue: obj1[key], newValue: obj2[key] };
    }
  });
  
  // Check for removed properties
  Object.keys(obj1).forEach(key => {
    if (!(key in obj2)) {
      changes[key] = { type: 'removed', value: obj1[key] };
    }
  });
  
  return changes;
};

/**
 * Invert object (swap keys and values)
 */
const invert = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  
  const result = {};
  Object.keys(obj).forEach(key => {
    result[obj[key]] = key;
  });
  
  return result;
};

/**
 * Group array of objects by property
 */
const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : get(item, key);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
};

/**
 * Create object from array of key-value pairs
 */
const fromPairs = (pairs) => {
  if (!Array.isArray(pairs)) return {};
  
  const result = {};
  pairs.forEach(([key, value]) => {
    result[key] = value;
  });
  
  return result;
};

/**
 * Convert object to array of key-value pairs
 */
const toPairs = (obj) => {
  if (!obj || typeof obj !== 'object') return [];
  
  return Object.keys(obj).map(key => [key, obj[key]]);
};

/**
 * Merge objects with custom merger function
 */
const mergeWith = (target, source, merger) => {
  if (!isObject(target) || !isObject(source)) return target;
  
  const result = { ...target };
  
  Object.keys(source).forEach(key => {
    if (key in result && typeof merger === 'function') {
      result[key] = merger(result[key], source[key], key);
    } else {
      result[key] = source[key];
    }
  });
  
  return result;
};

module.exports = {
  deepClone,
  deepMerge,
  isObject,
  isEmpty,
  get,
  set,
  unset,
  pick,
  omit,
  mapKeys,
  mapValues,
  filterObject,
  flatten,
  unflatten,
  isEqual,
  diff,
  invert,
  groupBy,
  fromPairs,
  toPairs,
  mergeWith
};
