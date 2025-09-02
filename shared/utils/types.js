/**
 * Type Checking Utilities for FloWorx SaaS
 * Common type checking and validation functions
 */

/**
 * Check if value is a string
 */
const isString = (value) => {
  return typeof value === 'string';
};

/**
 * Check if value is a number
 */
const isNumber = (value) => {
  return typeof value === 'number' && !isNaN(value);
};

/**
 * Check if value is a boolean
 */
const isBoolean = (value) => {
  return typeof value === 'boolean';
};

/**
 * Check if value is a function
 */
const isFunction = (value) => {
  return typeof value === 'function';
};

/**
 * Check if value is an object (not null, not array)
 */
const isObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

/**
 * Check if value is an array
 */
const isArray = (value) => {
  return Array.isArray(value);
};

/**
 * Check if value is null
 */
const isNull = (value) => {
  return value === null;
};

/**
 * Check if value is undefined
 */
const isUndefined = (value) => {
  return value === undefined;
};

/**
 * Check if value is null or undefined
 */
const isNil = (value) => {
  return value === null || value === undefined;
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
const isEmpty = (value) => {
  if (isNil(value)) return true;
  if (isString(value)) return value.length === 0;
  if (isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
};

/**
 * Check if value is a Date object
 */
const isDate = (value) => {
  return value instanceof Date;
};

/**
 * Check if value is a valid Date
 */
const isValidDate = (value) => {
  return isDate(value) && !isNaN(value.getTime());
};

/**
 * Check if value is a RegExp
 */
const isRegExp = (value) => {
  return value instanceof RegExp;
};

/**
 * Check if value is a Promise
 */
const isPromise = (value) => {
  return value && typeof value.then === 'function';
};

/**
 * Check if value is an Error
 */
const isError = (value) => {
  return value instanceof Error;
};

/**
 * Check if value is a plain object (created by {} or new Object())
 */
const isPlainObject = (value) => {
  if (!isObject(value)) return false;
  
  // Objects created by the Object constructor
  if (value.constructor === Object) return true;
  
  // Objects with no prototype (created with Object.create(null))
  if (Object.getPrototypeOf(value) === null) return true;
  
  return false;
};

/**
 * Check if value is an integer
 */
const isInteger = (value) => {
  return Number.isInteger(value);
};

/**
 * Check if value is a float
 */
const isFloat = (value) => {
  return isNumber(value) && !isInteger(value);
};

/**
 * Check if value is positive
 */
const isPositive = (value) => {
  return isNumber(value) && value > 0;
};

/**
 * Check if value is negative
 */
const isNegative = (value) => {
  return isNumber(value) && value < 0;
};

/**
 * Check if value is zero
 */
const isZero = (value) => {
  return value === 0;
};

/**
 * Check if value is even
 */
const isEven = (value) => {
  return isInteger(value) && value % 2 === 0;
};

/**
 * Check if value is odd
 */
const isOdd = (value) => {
  return isInteger(value) && value % 2 !== 0;
};

/**
 * Check if string is numeric
 */
const isNumericString = (value) => {
  return isString(value) && !isNaN(Number(value)) && !isNaN(parseFloat(value));
};

/**
 * Check if value is a valid email
 */
const isEmail = (value) => {
  if (!isString(value)) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(value);
};

/**
 * Check if value is a valid URL
 */
const isUrl = (value) => {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if value is a valid UUID
 */
const isUuid = (value) => {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Check if value is a valid JSON string
 */
const isJsonString = (value) => {
  if (!isString(value)) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if value is a valid phone number
 */
const isPhoneNumber = (value) => {
  if (!isString(value)) return false;
  const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  return phoneRegex.test(value);
};

/**
 * Get the type of a value
 */
const getType = (value) => {
  if (isNull(value)) return 'null';
  if (isArray(value)) return 'array';
  if (isDate(value)) return 'date';
  if (isRegExp(value)) return 'regexp';
  if (isError(value)) return 'error';
  return typeof value;
};

/**
 * Check if value matches expected type
 */
const isType = (value, expectedType) => {
  const actualType = getType(value);
  
  if (Array.isArray(expectedType)) {
    return expectedType.includes(actualType);
  }
  
  return actualType === expectedType;
};

/**
 * Validate value against multiple type checks
 */
const validateType = (value, validators) => {
  if (!isObject(validators)) return false;
  
  return Object.entries(validators).every(([validatorName, expected]) => {
    switch (validatorName) {
      case 'type':
        return isType(value, expected);
      case 'required':
        return expected ? !isNil(value) : true;
      case 'notEmpty':
        return expected ? !isEmpty(value) : true;
      case 'min':
        return isNumber(value) ? value >= expected : (isString(value) || isArray(value)) ? value.length >= expected : true;
      case 'max':
        return isNumber(value) ? value <= expected : (isString(value) || isArray(value)) ? value.length <= expected : true;
      case 'pattern':
        return isString(value) && isRegExp(expected) ? expected.test(value) : true;
      case 'custom':
        return isFunction(expected) ? expected(value) : true;
      default:
        return true;
    }
  });
};

/**
 * Type coercion utilities
 */
const coerce = {
  /**
   * Coerce to string
   */
  toString: (value) => {
    if (isString(value)) return value;
    if (isNil(value)) return '';
    return String(value);
  },

  /**
   * Coerce to number
   */
  toNumber: (value) => {
    if (isNumber(value)) return value;
    if (isString(value) && isNumericString(value)) return Number(value);
    return NaN;
  },

  /**
   * Coerce to boolean
   */
  toBoolean: (value) => {
    if (isBoolean(value)) return value;
    if (isString(value)) {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    if (isNumber(value)) return value !== 0;
    return Boolean(value);
  },

  /**
   * Coerce to array
   */
  toArray: (value) => {
    if (isArray(value)) return value;
    if (isNil(value)) return [];
    return [value];
  },

  /**
   * Coerce to Date
   */
  toDate: (value) => {
    if (isDate(value)) return value;
    if (isString(value) || isNumber(value)) {
      const date = new Date(value);
      return isValidDate(date) ? date : null;
    }
    return null;
  }
};

module.exports = {
  // Basic type checks
  isString,
  isNumber,
  isBoolean,
  isFunction,
  isObject,
  isArray,
  isNull,
  isUndefined,
  isNil,
  isEmpty,
  isDate,
  isValidDate,
  isRegExp,
  isPromise,
  isError,
  isPlainObject,

  // Number type checks
  isInteger,
  isFloat,
  isPositive,
  isNegative,
  isZero,
  isEven,
  isOdd,
  isNumericString,

  // Format validation
  isEmail,
  isUrl,
  isUuid,
  isJsonString,
  isPhoneNumber,

  // Type utilities
  getType,
  isType,
  validateType,
  coerce
};
