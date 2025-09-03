/**
 * Response format utility for consistent API responses
 */
class ResponseFormatter {
  /**
   * Format a success response
   */
  static success(data = null, message = 'Success', meta = {}) {
    return {
      success: true,
      message,
      data,
      meta,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format a paginated response
   */
  static paginated(data, page, limit, total, meta = {}) {
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data,
      meta: {
        ...meta,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format an error response
   */
  static error(message = 'An error occurred', errors = null, code = 500) {
    return {
      success: false,
      message,
      errors,
      code,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format a validation error response
   */
  static validationError(errors) {
    return {
      success: false,
      message: 'Validation failed',
      errors,
      code: 400,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create Express middleware for response formatting
   */
  static middleware() {
    return (req, res, next) => {
      // Add response formatting methods to res object
      res.success = function (data, message, meta) {
        return this.json(ResponseFormatter.success(data, message, meta));
      };

      res.paginated = function (data, page, limit, total, meta) {
        return this.json(ResponseFormatter.paginated(data, page, limit, total, meta));
      };

      res.error = function (message, errors, code = 500) {
        return this.status(code).json(ResponseFormatter.error(message, errors, code));
      };

      res.validationError = function (errors) {
        return this.status(400).json(ResponseFormatter.validationError(errors));
      };

      next();
    };
  }
}

module.exports = ResponseFormatter;
