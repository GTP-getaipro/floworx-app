/**
 * Simple Error Response Class
 * Replacement for the deleted ErrorResponse utility
 */

class ErrorResponse extends Error {
  constructor(message, statusCode = 500, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = 'ErrorResponse';
  }

  static internalError(message = 'Internal Server Error', data = null) {
    return new ErrorResponse(message, 500, data);
  }

  static serviceUnavailable(message = 'Service Unavailable', data = null) {
    return new ErrorResponse(message, 503, data);
  }

  static forbidden(message = 'Forbidden', data = null) {
    return new ErrorResponse(message, 403, data);
  }

  static badRequest(message = 'Bad Request', data = null) {
    return new ErrorResponse(message, 400, data);
  }

  static unauthorized(message = 'Unauthorized', data = null) {
    return new ErrorResponse(message, 401, data);
  }

  static notFound(message = 'Not Found', data = null) {
    return new ErrorResponse(message, 404, data);
  }

  send(res, req = null) {
    const response = {
      success: false,
      error: {
        message: this.message,
        statusCode: this.statusCode
      }
    };

    if (this.data) {
      response.error.data = this.data;
    }

    if (req && process.env.NODE_ENV !== 'production') {
      response.error.stack = this.stack;
    }

    return res.status(this.statusCode).json(response);
  }
}

module.exports = { ErrorResponse };
