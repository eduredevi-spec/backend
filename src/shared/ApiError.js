import { HTTP_STATUS, ERROR_CODES } from "../constants/index.js";

/**
 * Custom application error. Carries an HTTP status code, a machine-readable
 * error code, a human-readable message, and optional field-level details.
 */
export class ApiError extends Error {
  constructor(statusCode, message, code, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** 400 – validation or malformed request */
  static badRequest(message, details) {
    return new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      message,
      ERROR_CODES.VALIDATION_ERROR,
      details,
    );
  }

  /** 401 – not authenticated; accepts an optional specific error code */
  static unauthorized(message, code = ERROR_CODES.UNAUTHORIZED) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, code);
  }

  /** 403 – authenticated but not authorised */
  static forbidden(message) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message, ERROR_CODES.FORBIDDEN);
  }

  /** 404 – resource not found */
  static notFound(message) {
    return new ApiError(
      HTTP_STATUS.NOT_FOUND,
      message,
      ERROR_CODES.RESOURCE_NOT_FOUND,
    );
  }

  /** 409 – duplicate / already exists */
  static conflict(message) {
    return new ApiError(
      HTTP_STATUS.CONFLICT,
      message,
      ERROR_CODES.DUPLICATE_RESOURCE,
    );
  }

  /** 500 – unexpected server error */
  static internal(message = "Internal server error") {
    return new ApiError(
      HTTP_STATUS.INTERNAL_SERVER,
      message,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }
}

export default ApiError;
