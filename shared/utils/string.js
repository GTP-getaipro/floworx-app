/**
 * String Utilities for FloWorx SaaS
 * Common string manipulation and processing functions
 */

/**
 * Generate random string
 */
const generateRandomString = (length = 10, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * Generate UUID v4
 */
const generateUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Generate slug from string
 */
const generateSlug = (text, maxLength = 50) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, maxLength);
};

/**
 * Convert string to camelCase
 */
const toCamelCase = (str) => {
  if (!str) return '';
  
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

/**
 * Convert string to PascalCase
 */
const toPascalCase = (str) => {
  if (!str) return '';
  
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
      return word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

/**
 * Convert string to snake_case
 */
const toSnakeCase = (str) => {
  if (!str) return '';
  
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
};

/**
 * Convert string to kebab-case
 */
const toKebabCase = (str) => {
  if (!str) return '';
  
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('-');
};

/**
 * Capitalize first letter
 */
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Remove extra whitespace
 */
const normalizeWhitespace = (str) => {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
};

/**
 * Extract initials from name
 */
const getInitials = (name, maxInitials = 2) => {
  if (!name) return '';
  
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .slice(0, maxInitials)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
};

/**
 * Mask sensitive information
 */
const maskString = (str, visibleStart = 2, visibleEnd = 2, maskChar = '*') => {
  if (!str || str.length <= visibleStart + visibleEnd) return str;
  
  const start = str.substring(0, visibleStart);
  const end = str.substring(str.length - visibleEnd);
  const maskLength = str.length - visibleStart - visibleEnd;
  
  return start + maskChar.repeat(maskLength) + end;
};

/**
 * Mask email address
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  
  const [username, domain] = email.split('@');
  const maskedUsername = maskString(username, 1, 1);
  
  return `${maskedUsername}@${domain}`;
};

/**
 * Mask phone number
 */
const maskPhone = (phone) => {
  if (!phone) return phone;
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ***-${cleaned.substring(6)}`;
  }
  
  return maskString(phone, 2, 2);
};

/**
 * Extract domain from email
 */
const extractDomain = (email) => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1];
};

/**
 * Check if string contains only digits
 */
const isNumeric = (str) => {
  if (!str) return false;
  return /^\d+$/.test(str);
};

/**
 * Check if string contains only letters
 */
const isAlpha = (str) => {
  if (!str) return false;
  return /^[a-zA-Z]+$/.test(str);
};

/**
 * Check if string contains only letters and numbers
 */
const isAlphanumeric = (str) => {
  if (!str) return false;
  return /^[a-zA-Z0-9]+$/.test(str);
};

/**
 * Count words in string
 */
const countWords = (str) => {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Truncate string at word boundary
 */
const truncateAtWord = (str, maxLength, suffix = '...') => {
  if (!str || str.length <= maxLength) return str;
  
  const truncated = str.substring(0, maxLength - suffix.length);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + suffix;
  }
  
  return truncated + suffix;
};

/**
 * Remove HTML tags from string
 */
const stripHtml = (str) => {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Escape HTML characters
 */
const escapeHtml = (str) => {
  if (!str) return '';
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return str.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};

/**
 * Unescape HTML characters
 */
const unescapeHtml = (str) => {
  if (!str) return '';
  
  const htmlUnescapes = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/'
  };
  
  return str.replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/g, (match) => htmlUnescapes[match]);
};

/**
 * Generate hash from string (simple hash function)
 */
const simpleHash = (str) => {
  if (!str) return 0;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Compare strings ignoring case and whitespace
 */
const fuzzyEquals = (str1, str2) => {
  if (!str1 && !str2) return true;
  if (!str1 || !str2) return false;
  
  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '');
  return normalize(str1) === normalize(str2);
};

/**
 * Calculate string similarity (Levenshtein distance)
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLength = Math.max(len1, len2);
  return (maxLength - matrix[len2][len1]) / maxLength;
};

module.exports = {
  generateRandomString,
  generateUuid,
  generateSlug,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  capitalize,
  normalizeWhitespace,
  getInitials,
  maskString,
  maskEmail,
  maskPhone,
  extractDomain,
  isNumeric,
  isAlpha,
  isAlphanumeric,
  countWords,
  truncateAtWord,
  stripHtml,
  escapeHtml,
  unescapeHtml,
  simpleHash,
  fuzzyEquals,
  calculateSimilarity
};
