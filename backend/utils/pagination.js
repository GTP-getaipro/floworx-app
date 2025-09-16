/**
 * Simple Pagination Utility
 * Replacement for the deleted pagination utility
 */

/**
 * Calculate pagination parameters
 * @param {number} page - Current page number (1-based)
 * @param {number} limit - Items per page
 * @param {number} totalCount - Total number of items
 * @returns {Object} Pagination metadata
 */
function calculatePagination(page = 1, limit = 10, totalCount = 0) {
  const currentPage = Math.max(1, parseInt(page));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit))); // Max 100 items per page
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalCount,
    offset,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    previousPage: currentPage > 1 ? currentPage - 1 : null
  };
}

/**
 * Create pagination response
 * @param {Array} data - Array of items for current page
 * @param {Object} pagination - Pagination metadata from calculatePagination
 * @returns {Object} Formatted response with data and pagination
 */
function createPaginatedResponse(data, pagination) {
  return {
    success: true,
    data,
    pagination: {
      currentPage: pagination.currentPage,
      itemsPerPage: pagination.itemsPerPage,
      totalPages: pagination.totalPages,
      totalCount: pagination.totalCount,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage,
      nextPage: pagination.nextPage,
      previousPage: pagination.previousPage
    }
  };
}

/**
 * Extract pagination parameters from request query
 * @param {Object} query - Express request query object
 * @returns {Object} Extracted pagination parameters
 */
function extractPaginationParams(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  
  return {
    page: Math.max(1, page),
    limit: Math.max(1, Math.min(100, limit))
  };
}

/**
 * Paginate array in memory (for small datasets)
 * @param {Array} array - Array to paginate
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated response
 */
function paginateArray(array, page = 1, limit = 10) {
  const totalCount = array.length;
  const pagination = calculatePagination(page, limit, totalCount);
  const startIndex = pagination.offset;
  const endIndex = startIndex + pagination.itemsPerPage;
  const data = array.slice(startIndex, endIndex);

  return createPaginatedResponse(data, pagination);
}

module.exports = {
  calculatePagination,
  createPaginatedResponse,
  extractPaginationParams,
  paginateArray
};
