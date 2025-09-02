/**
 * Array Utilities for FloWorx SaaS
 * Common array manipulation and processing functions
 */

/**
 * Remove duplicates from array
 */
const unique = (array, key = null) => {
  if (!Array.isArray(array)) return [];
  
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const value = typeof key === 'function' ? key(item) : item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }
  
  return [...new Set(array)];
};

/**
 * Chunk array into smaller arrays
 */
const chunk = (array, size) => {
  if (!Array.isArray(array) || size <= 0) return [];
  
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
};

/**
 * Flatten array of arrays
 */
const flatten = (array, depth = 1) => {
  if (!Array.isArray(array)) return [];
  
  return depth > 0 
    ? array.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val, depth - 1) : val), [])
    : array.slice();
};

/**
 * Deep flatten array
 */
const flattenDeep = (array) => {
  if (!Array.isArray(array)) return [];
  
  return array.reduce((acc, val) => 
    acc.concat(Array.isArray(val) ? flattenDeep(val) : val), []
  );
};

/**
 * Compact array (remove falsy values)
 */
const compact = (array) => {
  if (!Array.isArray(array)) return [];
  return array.filter(Boolean);
};

/**
 * Get intersection of arrays
 */
const intersection = (...arrays) => {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return [...arrays[0]];
  
  return arrays.reduce((acc, array) => 
    acc.filter(item => array.includes(item))
  );
};

/**
 * Get union of arrays
 */
const union = (...arrays) => {
  return unique(arrays.flat());
};

/**
 * Get difference between arrays
 */
const difference = (array, ...others) => {
  if (!Array.isArray(array)) return [];
  
  const otherItems = new Set(others.flat());
  return array.filter(item => !otherItems.has(item));
};

/**
 * Sort array by multiple criteria
 */
const sortBy = (array, ...criteria) => {
  if (!Array.isArray(array)) return [];
  
  return [...array].sort((a, b) => {
    for (const criterion of criteria) {
      let aVal, bVal, desc = false;
      
      if (typeof criterion === 'string') {
        aVal = a[criterion];
        bVal = b[criterion];
      } else if (typeof criterion === 'function') {
        aVal = criterion(a);
        bVal = criterion(b);
      } else if (typeof criterion === 'object') {
        const { key, order = 'asc' } = criterion;
        aVal = typeof key === 'function' ? key(a) : a[key];
        bVal = typeof key === 'function' ? key(b) : b[key];
        desc = order === 'desc';
      }
      
      if (aVal < bVal) return desc ? 1 : -1;
      if (aVal > bVal) return desc ? -1 : 1;
    }
    return 0;
  });
};

/**
 * Group array by key
 */
const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
};

/**
 * Count occurrences in array
 */
const countBy = (array, key) => {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((counts, item) => {
    const countKey = typeof key === 'function' ? key(item) : item[key];
    counts[countKey] = (counts[countKey] || 0) + 1;
    return counts;
  }, {});
};

/**
 * Find item by property
 */
const findBy = (array, key, value) => {
  if (!Array.isArray(array)) return null;
  
  return array.find(item => {
    const itemValue = typeof key === 'function' ? key(item) : item[key];
    return itemValue === value;
  });
};

/**
 * Filter array by multiple conditions
 */
const filterBy = (array, conditions) => {
  if (!Array.isArray(array)) return [];
  
  return array.filter(item => {
    return Object.entries(conditions).every(([key, value]) => {
      const itemValue = item[key];
      
      if (Array.isArray(value)) {
        return value.includes(itemValue);
      }
      
      if (typeof value === 'object' && value !== null) {
        const { operator = '=', value: conditionValue } = value;
        
        switch (operator) {
          case '>': return itemValue > conditionValue;
          case '>=': return itemValue >= conditionValue;
          case '<': return itemValue < conditionValue;
          case '<=': return itemValue <= conditionValue;
          case '!=': return itemValue !== conditionValue;
          case 'contains': return String(itemValue).includes(conditionValue);
          case 'startsWith': return String(itemValue).startsWith(conditionValue);
          case 'endsWith': return String(itemValue).endsWith(conditionValue);
          default: return itemValue === conditionValue;
        }
      }
      
      return itemValue === value;
    });
  });
};

/**
 * Paginate array
 */
const paginate = (array, page = 1, limit = 10) => {
  if (!Array.isArray(array)) return { items: [], pagination: {} };
  
  const offset = (page - 1) * limit;
  const items = array.slice(offset, offset + limit);
  const totalCount = array.length;
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    items,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Shuffle array
 */
const shuffle = (array) => {
  if (!Array.isArray(array)) return [];
  
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

/**
 * Sample random items from array
 */
const sample = (array, count = 1) => {
  if (!Array.isArray(array)) return [];
  if (count >= array.length) return shuffle(array);
  
  const shuffled = shuffle(array);
  return shuffled.slice(0, count);
};

/**
 * Get random item from array
 */
const randomItem = (array) => {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Move item in array
 */
const move = (array, fromIndex, toIndex) => {
  if (!Array.isArray(array)) return [];
  
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  return result;
};

/**
 * Insert item at index
 */
const insert = (array, index, ...items) => {
  if (!Array.isArray(array)) return [...items];
  
  const result = [...array];
  result.splice(index, 0, ...items);
  
  return result;
};

/**
 * Remove item at index
 */
const removeAt = (array, index) => {
  if (!Array.isArray(array)) return [];
  
  const result = [...array];
  result.splice(index, 1);
  
  return result;
};

/**
 * Remove items by value
 */
const remove = (array, ...values) => {
  if (!Array.isArray(array)) return [];
  
  return array.filter(item => !values.includes(item));
};

/**
 * Get first n items
 */
const take = (array, count = 1) => {
  if (!Array.isArray(array)) return [];
  return array.slice(0, count);
};

/**
 * Get last n items
 */
const takeLast = (array, count = 1) => {
  if (!Array.isArray(array)) return [];
  return array.slice(-count);
};

/**
 * Drop first n items
 */
const drop = (array, count = 1) => {
  if (!Array.isArray(array)) return [];
  return array.slice(count);
};

/**
 * Drop last n items
 */
const dropLast = (array, count = 1) => {
  if (!Array.isArray(array)) return [];
  return array.slice(0, -count);
};

/**
 * Check if arrays are equal
 */
const isEqual = (array1, array2) => {
  if (!Array.isArray(array1) || !Array.isArray(array2)) return false;
  if (array1.length !== array2.length) return false;
  
  return array1.every((item, index) => {
    if (Array.isArray(item) && Array.isArray(array2[index])) {
      return isEqual(item, array2[index]);
    }
    return item === array2[index];
  });
};

/**
 * Sum array values
 */
const sum = (array, key = null) => {
  if (!Array.isArray(array)) return 0;
  
  return array.reduce((total, item) => {
    const value = key ? (typeof key === 'function' ? key(item) : item[key]) : item;
    return total + (Number(value) || 0);
  }, 0);
};

/**
 * Get average of array values
 */
const average = (array, key = null) => {
  if (!Array.isArray(array) || array.length === 0) return 0;
  return sum(array, key) / array.length;
};

/**
 * Get min value from array
 */
const min = (array, key = null) => {
  if (!Array.isArray(array) || array.length === 0) return null;
  
  const values = key ? array.map(item => typeof key === 'function' ? key(item) : item[key]) : array;
  return Math.min(...values.filter(v => typeof v === 'number' && !isNaN(v)));
};

/**
 * Get max value from array
 */
const max = (array, key = null) => {
  if (!Array.isArray(array) || array.length === 0) return null;
  
  const values = key ? array.map(item => typeof key === 'function' ? key(item) : item[key]) : array;
  return Math.max(...values.filter(v => typeof v === 'number' && !isNaN(v)));
};

module.exports = {
  unique,
  chunk,
  flatten,
  flattenDeep,
  compact,
  intersection,
  union,
  difference,
  sortBy,
  groupBy,
  countBy,
  findBy,
  filterBy,
  paginate,
  shuffle,
  sample,
  randomItem,
  move,
  insert,
  removeAt,
  remove,
  take,
  takeLast,
  drop,
  dropLast,
  isEqual,
  sum,
  average,
  min,
  max
};
