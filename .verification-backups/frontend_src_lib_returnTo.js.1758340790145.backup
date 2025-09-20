const STORAGE_KEY = 'floworx:returnTo';

/**
 * Sanitize returnTo path to prevent open redirects
 * Allow only:
 * - empty/undefined
 * - absolute paths starting with "/" (no protocol/host)
 * - can contain hash/queries
 * Reject: external URLs, protocol-relative URLs, javascript: etc.
 */
export function sanitizeReturnTo(path) {
  if (!path || typeof path !== 'string') {
    return null;
  }

  const trimmed = path.trim();
  
  // Empty string is valid (will use default)
  if (!trimmed) {
    return null;
  }

  // Must start with "/" for absolute path
  if (!trimmed.startsWith('/')) {
    return null;
  }

  // Reject protocol-relative URLs (//example.com)
  if (trimmed.startsWith('//')) {
    return null;
  }

  // Reject if contains protocol (http:, https:, javascript:, etc.)
  if (trimmed.includes(':')) {
    return null;
  }

  // Additional safety: reject if contains backslashes (Windows path traversal)
  if (trimmed.includes('\\')) {
    return null;
  }

  return trimmed;
}

/**
 * Store returnTo path in localStorage
 */
export function setReturnTo(path) {
  const sanitized = sanitizeReturnTo(path);
  if (sanitized) {
    localStorage.setItem(STORAGE_KEY, sanitized);
  }
}

/**
 * Get returnTo path from localStorage
 */
export function getReturnTo() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return sanitizeReturnTo(stored);
}

/**
 * Clear returnTo path from localStorage
 */
export function clearReturnTo() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get returnTo from URL query params and store it
 */
export function handleReturnToFromQuery(searchParams) {
  const returnTo = searchParams.get('returnTo');
  if (returnTo) {
    setReturnTo(returnTo);
  }
}
