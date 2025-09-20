/**
 * CSRF token management utility
 *
 * Handles fetching, storing, and managing CSRF tokens for secure requests
 * with comprehensive error handling and retry mechanisms.
 *
 * @file
 * @features
 * - Promise-based CSRF token fetching with caching
 * - Prevents multiple concurrent requests to CSRF endpoint
 * - Comprehensive error handling with proper error propagation
 * - Token invalidation for security scenarios
 * - Memory-based token storage for performance
 *
 * @dependencies
 * - Requires /api/auth/csrf endpoint on the server
 * - Uses fetch API with credentials for authenticated requests
 */

let csrfToken = null;
let csrfPromise = null;

/**
 * Fetches CSRF token from server and stores it in memory
 * Uses promise caching to prevent multiple concurrent requests
 * @returns {Promise<string>} The CSRF token
 */
export async function ensureCsrf() {
  // If we already have a token, return it
  if (csrfToken) {
    return csrfToken;
  }

  // If there's already a fetch in progress, wait for it
  if (csrfPromise) {
    return csrfPromise;
  }

  // Start a new fetch and cache the promise
  csrfPromise = fetchCsrfToken();
  
  try {
    const token = await csrfPromise;
    csrfToken = token;
    return token;
  } catch (error) {
    // Clear the promise on error so we can retry
    csrfPromise = null;
    throw error;
  } finally {
    // Clear the promise once resolved (success or failure)
    csrfPromise = null;
  }
}

/**
 * Internal function to fetch CSRF token from server
 * @returns {Promise<string>} The CSRF token
 */
async function fetchCsrfToken() {
  try {
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.csrf) {
      throw new Error('CSRF token not found in response');
    }

    return data.csrf;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Returns the current CSRF token from memory
 * @returns {string|null} The current CSRF token or null if not available
 */
export function getCsrf() {
  return csrfToken;
}

/**
 * Clears the in-memory CSRF token
 * Used when token becomes invalid and needs to be refetched
 */
export function invalidateCsrf() {
  csrfToken = null;
  csrfPromise = null;
}
