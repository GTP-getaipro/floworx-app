/**
 * Formatting Utilities for FloWorx SaaS
 * Common formatting functions for numbers, currency, text, etc.
 */

/**
 * Currency formatting options
 */
const CURRENCY_FORMATS = {
  USD: { currency: 'USD', locale: 'en-US' },
  EUR: { currency: 'EUR', locale: 'en-EU' },
  GBP: { currency: 'GBP', locale: 'en-GB' },
  CAD: { currency: 'CAD', locale: 'en-CA' }
};

/**
 * Number formatting options
 */
const NUMBER_FORMATS = {
  INTEGER: { maximumFractionDigits: 0 },
  DECIMAL: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  PERCENTAGE: { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 },
  COMPACT: { notation: 'compact', compactDisplay: 'short' }
};

/**
 * Format currency amount
 */
const formatCurrency = (amount, currencyCode = 'USD', options = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }

  const format = CURRENCY_FORMATS[currencyCode] || CURRENCY_FORMATS.USD;
  
  try {
    return new Intl.NumberFormat(format.locale, {
      style: 'currency',
      currency: format.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    }).format(Number(amount));
  } catch (error) {
    console.warn(`Currency formatting error: ${error.message}`);
    return `$${Number(amount).toFixed(2)}`;
  }
};

/**
 * Format number with various options
 */
const formatNumber = (number, format = 'DECIMAL', options = {}) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }

  const formatOptions = NUMBER_FORMATS[format] || NUMBER_FORMATS.DECIMAL;
  
  try {
    return new Intl.NumberFormat('en-US', {
      ...formatOptions,
      ...options
    }).format(Number(number));
  } catch (error) {
    console.warn(`Number formatting error: ${error.message}`);
    return Number(number).toString();
  }
};

/**
 * Format percentage
 */
const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const percentage = Number(value) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Format file size in human readable format
 */
const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || isNaN(bytes)) return 'Unknown';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format duration in human readable format
 */
const formatDuration = (milliseconds, format = 'long') => {
  if (!milliseconds || isNaN(milliseconds)) return '0ms';

  const ms = Math.abs(milliseconds);
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (format === 'short') {
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    if (seconds > 0) return `${seconds}s`;
    return `${ms}ms`;
  }

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`);
  
  if (parts.length === 0) {
    return `${ms} millisecond${ms !== 1 ? 's' : ''}`;
  }

  return parts.join(', ');
};

/**
 * Format phone number
 */
const formatPhoneNumber = (phoneNumber, format = 'US') => {
  if (!phoneNumber) return '';

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (format === 'US') {
    // US phone number formatting
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
  }

  // International format
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }

  return phoneNumber; // Return original if can't format
};

/**
 * Format text to title case
 */
const toTitleCase = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format text to sentence case
 */
const toSentenceCase = (text) => {
  if (!text) return '';
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Format camelCase to readable text
 */
const camelCaseToReadable = (text) => {
  if (!text) return '';
  
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

/**
 * Format snake_case to readable text
 */
const snakeCaseToReadable = (text) => {
  if (!text) return '';
  
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Truncate text with ellipsis
 */
const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Format list with proper conjunctions
 */
const formatList = (items, conjunction = 'and') => {
  if (!Array.isArray(items) || items.length === 0) return '';
  
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  
  return `${otherItems.join(', ')}, ${conjunction} ${lastItem}`;
};

/**
 * Format address
 */
const formatAddress = (address) => {
  if (!address || typeof address !== 'object') return '';
  
  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode) parts.push(address.zipCode);
  if (address.country && address.country !== 'US') parts.push(address.country);
  
  return parts.join(', ');
};

/**
 * Format name (first, last)
 */
const formatName = (firstName, lastName, format = 'full') => {
  if (!firstName && !lastName) return '';
  
  switch (format) {
    case 'first':
      return firstName || '';
    case 'last':
      return lastName || '';
    case 'initials':
      const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
      const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
      return `${firstInitial}${lastInitial}`;
    case 'lastFirst':
      if (firstName && lastName) return `${lastName}, ${firstName}`;
      return firstName || lastName || '';
    case 'full':
    default:
      return [firstName, lastName].filter(Boolean).join(' ');
  }
};

/**
 * Format business name
 */
const formatBusinessName = (businessName) => {
  if (!businessName) return '';
  
  // Common business suffixes that should be uppercase
  const suffixes = ['LLC', 'INC', 'CORP', 'LTD', 'LP', 'LLP'];
  
  return businessName
    .split(' ')
    .map(word => {
      const upperWord = word.toUpperCase();
      if (suffixes.includes(upperWord)) {
        return upperWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Format status badge text
 */
const formatStatus = (status) => {
  if (!status) return '';
  
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format error message for display
 */
const formatErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error.message) return error.message;
  
  if (error.error && error.error.message) return error.error.message;
  
  return 'An error occurred';
};

module.exports = {
  // Constants
  CURRENCY_FORMATS,
  NUMBER_FORMATS,
  
  // Currency and numbers
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatDuration,
  
  // Text formatting
  toTitleCase,
  toSentenceCase,
  camelCaseToReadable,
  snakeCaseToReadable,
  truncateText,
  formatList,
  
  // Specific formatters
  formatPhoneNumber,
  formatAddress,
  formatName,
  formatBusinessName,
  formatStatus,
  formatErrorMessage
};
