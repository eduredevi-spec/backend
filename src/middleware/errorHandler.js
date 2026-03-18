import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ApiError } from '../shared/ApiError.js';
import * as ApiResponse from '../shared/ApiResponse.js';
import { HTTP_STATUS, ERROR_CODES } from '../constants/index.js';

/**
 * Central Express error handler. Must be registered as the last middleware.
 * Translates all known error types into the standard ApiResponse.error format.
 * Never exposes internal stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  // Known application error
  if (err instanceof ApiError) {
    return ApiResponse.error(res, {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Mongoose field validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation error',
      details,
    });
  }

  // Mongoose CastError — invalid ObjectId or type mismatch
  if (err instanceof mongoose.Error.CastError) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid ID format',
    });
  }

  // MongoDB duplicate key (e.g. unique index violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.CONFLICT,
      code: ERROR_CODES.DUPLICATE_RESOURCE,
      message: `${field} already exists`,
    });
  }

  // JWT errors that escape the authenticate middleware
  if (err instanceof jwt.TokenExpiredError) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.TOKEN_EXPIRED,
      message: 'Token has expired',
    });
  }

  if (err instanceof jwt.JsonWebTokenError) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.TOKEN_INVALID,
      message: 'Invalid token',
    });
  }

  // Unknown / unexpected error
  console.error('[UNHANDLED ERROR]', err);

  return ApiResponse.error(res, {
    statusCode: HTTP_STATUS.INTERNAL_SERVER,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
};
