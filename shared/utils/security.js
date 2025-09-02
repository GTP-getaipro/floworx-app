/**
 * Security Utilities for FloWorx SaaS
 * Common security functions for sanitization, validation, and protection
 */

/**
 * Sanitize string to prevent XSS attacks
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:text\/html/gi, '') // Remove data URLs
    .trim();
};

/**
 * Sanitize HTML content
 */
const sanitizeHtml = (html) => {
  if (typeof html !== 'string') return html;
  
  // Remove script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove dangerous attributes
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s*javascript:\s*[^"'\s>]*/gi, '');
  html = html.replace(/\s*data:\s*[^"'\s>]*/gi, '');
  
  // Remove style attributes that could contain expressions
  html = html.replace(/\s*style\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi, '');
  
  return html;
};

/**
 * Escape HTML characters
 */
const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};

/**
 * Sanitize SQL input to prevent injection
 */
const sanitizeSql = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove or escape dangerous SQL patterns
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|UNION|SELECT)\b/gi, '') // Remove dangerous keywords
    .trim();
};

/**
 * Validate and sanitize email
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, ''); // Keep only valid email characters
};

/**
 * Sanitize phone number
 */
const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  
  return phone.replace(/[^\d+()-.\s]/g, ''); // Keep only valid phone characters
};

/**
 * Generate secure random string
 */
const generateSecureToken = (length = 32) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto.getRandomValues if available (browser)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += charset[array[i] % charset.length];
    }
    return result;
  }
  
  // Fallback to Math.random (less secure)
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return result;
};

/**
 * Generate secure UUID
 */
const generateSecureUuid = () => {
  // Use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Hash password (client-side preparation)
 */
const preparePasswordHash = async (password, salt) => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without crypto.subtle
  return password; // Server should handle hashing
};

/**
 * Validate password strength
 */
const validatePasswordStrength = (password) => {
  if (typeof password !== 'string') {
    return { isValid: false, score: 0, feedback: ['Password must be a string'] };
  }
  
  const feedback = [];
  let score = 0;
  
  // Length check
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }
  
  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }
  
  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }
  
  // Number check
  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 1;
  }
  
  // Special character check
  if (!/[@$!%*?&]/.test(password)) {
    feedback.push('Password must contain at least one special character (@$!%*?&)');
  } else {
    score += 1;
  }
  
  // Common patterns check
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i
  ];
  
  if (commonPatterns.some(pattern => pattern.test(password))) {
    feedback.push('Password contains common patterns and is not secure');
    score = Math.max(0, score - 2);
  }
  
  return {
    isValid: score >= 5 && feedback.length === 0,
    score,
    feedback,
    strength: score <= 2 ? 'weak' : score <= 3 ? 'medium' : score <= 4 ? 'strong' : 'very strong'
  };
};

/**
 * Rate limiting helper
 */
const createRateLimiter = (maxRequests, windowMs) => {
  const requests = new Map();
  
  return (identifier) => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, validTimestamps);
      }
    }
    
    // Check current identifier
    const userRequests = requests.get(identifier) || [];
    const validUserRequests = userRequests.filter(ts => ts > windowStart);
    
    if (validUserRequests.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validUserRequests) + windowMs
      };
    }
    
    // Add current request
    validUserRequests.push(now);
    requests.set(identifier, validUserRequests);
    
    return {
      allowed: true,
      remaining: maxRequests - validUserRequests.length,
      resetTime: now + windowMs
    };
  };
};

/**
 * Mask sensitive data
 */
const maskSensitiveData = (data, fields = ['password', 'token', 'secret', 'key']) => {
  if (typeof data !== 'object' || data === null) return data;
  
  const masked = Array.isArray(data) ? [...data] : { ...data };
  
  const maskValue = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        
        if (fields.some(field => lowerKey.includes(field))) {
          obj[key] = '***MASKED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          maskValue(obj[key]);
        }
      }
    }
  };
  
  maskValue(masked);
  return masked;
};

/**
 * Validate CSRF token
 */
const validateCsrfToken = (token, expectedToken) => {
  if (!token || !expectedToken) return false;
  if (typeof token !== 'string' || typeof expectedToken !== 'string') return false;
  
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expectedToken.length) return false;
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  
  return result === 0;
};

/**
 * Check for suspicious patterns in input
 */
const detectSuspiciousPatterns = (input) => {
  if (typeof input !== 'string') return { suspicious: false, patterns: [] };
  
  const suspiciousPatterns = [
    { name: 'SQL Injection', regex: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|WHERE|INTO)\b)/i },
    { name: 'XSS Script', regex: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi },
    { name: 'XSS Event Handler', regex: /on\w+\s*=\s*["'][^"']*["']/gi },
    { name: 'Path Traversal', regex: /\.\.[\/\\]/g },
    { name: 'Command Injection', regex: /[;&|`$(){}[\]]/g },
    { name: 'LDAP Injection', regex: /[()=*!&|]/g }
  ];
  
  const detectedPatterns = [];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.regex.test(input)) {
      detectedPatterns.push(pattern.name);
    }
  }
  
  return {
    suspicious: detectedPatterns.length > 0,
    patterns: detectedPatterns
  };
};

/**
 * Secure headers for HTTP responses
 */
const getSecurityHeaders = () => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };
};

module.exports = {
  sanitizeString,
  sanitizeHtml,
  escapeHtml,
  sanitizeSql,
  sanitizeEmail,
  sanitizePhone,
  generateSecureToken,
  generateSecureUuid,
  preparePasswordHash,
  validatePasswordStrength,
  createRateLimiter,
  maskSensitiveData,
  validateCsrfToken,
  detectSuspiciousPatterns,
  getSecurityHeaders
};
