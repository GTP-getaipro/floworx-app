/**
 * Sanitize returnTo path to prevent open redirects
 * Allow only:
 * - empty/undefined
 * - absolute paths starting with "/" (no protocol/host)
 * - can contain hash/queries
 * Reject: external URLs, protocol-relative URLs, javascript: etc.
 */
function sanitizeReturnTo(path) {
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

module.exports = {
  sanitizeReturnTo
};
