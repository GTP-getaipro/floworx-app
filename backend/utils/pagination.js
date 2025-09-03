/**
 * Pagination Utilities for FloWorx SaaS
 * Efficient pagination with cursor-based and offset-based strategies
 */

const { ValidationError } = require('./errors');

/**
 * Pagination configuration and utilities
 */
class PaginationUtils {
  constructor() {
    this.defaults = {
      limit: 20,
      maxLimit: 100,
      defaultSort: 'created_at',
      defaultOrder: 'DESC'
    };
  }

  /**
   * Parse and validate pagination parameters
   */
  parsePaginationParams(query) {
    const {
      page = 1,
      limit = this.defaults.limit,
      offset = 0,
      sort = this.defaults.defaultSort,
      order = this.defaults.defaultOrder,
      cursor = null,
      search = null
    } = query;

    // Validate and sanitize parameters
    const parsedLimit = Math.min(parseInt(limit) || this.defaults.limit, this.defaults.maxLimit);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedOffset = Math.max(parseInt(offset) || (parsedPage - 1) * parsedLimit, 0);

    // Validate sort field (whitelist approach)
    const allowedSortFields = [
      'id',
      'created_at',
      'updated_at',
      'name',
      'email',
      'status',
      'first_name',
      'last_name',
      'business_name',
      'workflow_name'
    ];

    const validSort = allowedSortFields.includes(sort) ? sort : this.defaults.defaultSort;
    const validOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : this.defaults.defaultOrder;

    return {
      limit: parsedLimit,
      offset: parsedOffset,
      page: parsedPage,
      sort: validSort,
      order: validOrder,
      cursor,
      search: search ? search.trim() : null
    };
  }

  /**
   * Build SQL pagination clause
   */
  buildPaginationClause(params) {
    const { limit, offset, sort, order } = params;

    return {
      orderBy: `ORDER BY "${sort}" ${order}`,
      limit: `LIMIT $${this.getNextParamIndex()}`,
      offset: `OFFSET $${this.getNextParamIndex()}`,
      values: [limit, offset]
    };
  }

  /**
   * Build cursor-based pagination (more efficient for large datasets)
   */
  buildCursorPagination(params, cursorColumn = 'id') {
    const { limit, cursor, order } = params;

    let whereClause = '';
    const values = [limit];

    if (cursor) {
      const operator = order === 'DESC' ? '<' : '>';
      whereClause = `WHERE "${cursorColumn}" ${operator} $${this.getNextParamIndex()}`;
      values.push(cursor);
    }

    return {
      whereClause,
      orderBy: `ORDER BY "${cursorColumn}" ${order}`,
      limit: `LIMIT $1`,
      values
    };
  }

  /**
   * Build search clause with full-text search
   */
  buildSearchClause(searchTerm, searchColumns) {
    if (!searchTerm || !searchColumns.length) {
      return { whereClause: '', values: [] };
    }

    // Use PostgreSQL full-text search for better performance
    const searchConditions = searchColumns.map((column, index) => {
      return `"${column}" ILIKE $${this.getNextParamIndex()}`;
    });

    const whereClause = `WHERE (${searchConditions.join(' OR ')})`;
    const searchPattern = `%${searchTerm}%`;
    const values = new Array(searchColumns.length).fill(searchPattern);

    return { whereClause, values };
  }

  /**
   * Build advanced search with filters
   */
  buildAdvancedSearch(filters, allowedFilters) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(filters).forEach(([key, value]) => {
      if (allowedFilters[key] && value !== null && value !== undefined && value !== '') {
        const filterConfig = allowedFilters[key];

        switch (filterConfig.type) {
          case 'exact':
            conditions.push(`"${key}" = $${paramIndex}`);
            values.push(value);
            paramIndex++;
            break;

          case 'like':
            conditions.push(`"${key}" ILIKE $${paramIndex}`);
            values.push(`%${value}%`);
            paramIndex++;
            break;

          case 'in':
            if (Array.isArray(value) && value.length > 0) {
              const placeholders = value.map(() => `$${paramIndex++}`).join(',');
              conditions.push(`"${key}" IN (${placeholders})`);
              values.push(...value);
            }
            break;

          case 'range':
            if (value.min !== undefined) {
              conditions.push(`"${key}" >= $${paramIndex}`);
              values.push(value.min);
              paramIndex++;
            }
            if (value.max !== undefined) {
              conditions.push(`"${key}" <= $${paramIndex}`);
              values.push(value.max);
              paramIndex++;
            }
            break;

          case 'date':
            if (value.start) {
              conditions.push(`"${key}" >= $${paramIndex}`);
              values.push(value.start);
              paramIndex++;
            }
            if (value.end) {
              conditions.push(`"${key}" <= $${paramIndex}`);
              values.push(value.end);
              paramIndex++;
            }
            break;
        }
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { whereClause, values };
  }

  /**
   * Execute paginated query with count
   */
  async executePaginatedQuery(queryBuilder, countQueryBuilder, params) {
    const { limit, offset } = params;

    // Execute both queries in parallel
    const [dataResult, countResult] = await Promise.all([queryBuilder(), countQueryBuilder()]);

    const items = dataResult.rows;
    const totalCount = parseInt(countResult.rows[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    return {
      items,
      pagination: {
        currentPage,
        totalPages,
        totalCount,
        limit,
        offset,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
        prevPage: hasPrevPage ? currentPage - 1 : null
      }
    };
  }

  /**
   * Execute cursor-based paginated query
   */
  async executeCursorPaginatedQuery(queryBuilder, params, cursorColumn = 'id') {
    const { limit } = params;

    const result = await queryBuilder();
    const items = result.rows;

    // Get cursor for next page
    const nextCursor = items.length === limit ? items[items.length - 1][cursorColumn] : null;
    const hasNextPage = items.length === limit;

    return {
      items,
      pagination: {
        limit,
        hasNextPage,
        nextCursor,
        cursorColumn
      }
    };
  }

  /**
   * Create pagination response metadata
   */
  createPaginationMeta(totalCount, currentPage, limit) {
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    return {
      currentPage,
      totalPages,
      totalCount,
      limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? currentPage + 1 : null,
      prevPage: hasPrevPage ? currentPage - 1 : null
    };
  }

  /**
   * Optimize query for large datasets
   */
  optimizeForLargeDataset(baseQuery, params) {
    const { offset, limit } = params;

    // For large offsets, use cursor-based pagination
    if (offset > 10000) {
      console.warn(`Large offset detected (${offset}). Consider using cursor-based pagination.`);
    }

    // Add query hints for PostgreSQL
    let optimizedQuery = baseQuery;

    // Use index hints for large datasets
    if (offset > 1000) {
      optimizedQuery = `/*+ USE_INDEX */ ${optimizedQuery}`;
    }

    return optimizedQuery;
  }

  /**
   * Get next parameter index (helper for building queries)
   */
  getNextParamIndex() {
    this.paramIndex = (this.paramIndex || 0) + 1;
    return this.paramIndex;
  }

  /**
   * Reset parameter index
   */
  resetParamIndex() {
    this.paramIndex = 0;
  }

  /**
   * Validate pagination parameters
   */
  validatePaginationParams(params) {
    const { limit, offset, page } = params;

    if (limit < 1 || limit > this.defaults.maxLimit) {
      throw new ValidationError(`Limit must be between 1 and ${this.defaults.maxLimit}`);
    }

    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    if (page < 1) {
      throw new ValidationError('Page must be positive');
    }

    return true;
  }

  /**
   * Create paginated response format
   */
  createPaginatedResponse(items, pagination, meta = {}) {
    return {
      success: true,
      data: items,
      pagination,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }
}

// Create singleton instance
const paginationUtils = new PaginationUtils();

/**
 * Express middleware for automatic pagination parsing
 */
const paginationMiddleware = (req, res, next) => {
  try {
    req.pagination = paginationUtils.parsePaginationParams(req.query);
    paginationUtils.validatePaginationParams(req.pagination);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  PaginationUtils,
  paginationUtils,
  paginationMiddleware
};
