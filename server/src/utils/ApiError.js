/**
 * Errors thrown with an explicit HTTP status code. The global error handler
 * forwards `statusCode` and `message` to the client.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
