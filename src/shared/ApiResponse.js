import { HTTP_STATUS } from '../constants/index.js';

/**
 * Sends a successful JSON response.
 * @param {object} options
 * @param {*}      options.data        - Response payload
 * @param {string} options.message     - Human-readable message
 * @param {number} options.statusCode  - HTTP status code (default 200)
 * @param {object} options.meta        - Extra metadata merged into meta block
 */
export const success = (res, { data = null, message = 'Success', statusCode = HTTP_STATUS.OK, meta = {} } = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    meta: { timestamp: new Date().toISOString(), ...meta },
  });
};

/** Shorthand for 201 Created */
export const created = (res, { data = null, message = 'Created', meta = {} } = {}) => {
  return success(res, { data, message, statusCode: HTTP_STATUS.CREATED, meta });
};

/** 204 No Content — no body */
export const noContent = (res) => res.status(HTTP_STATUS.NO_CONTENT).send();

/**
 * Sends an error JSON response.
 * @param {object} options
 * @param {number} options.statusCode - HTTP status code
 * @param {string} options.code       - Machine-readable error code
 * @param {string} options.message    - Human-readable message
 * @param {Array}  options.details    - Field-level validation details
 * @param {object} options.meta       - Extra metadata
 */
export const error = (res, { statusCode = HTTP_STATUS.INTERNAL_SERVER, code = 'INTERNAL_ERROR', message = 'Something went wrong', details = [], meta = {} } = {}) => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, details },
    meta: { timestamp: new Date().toISOString(), ...meta },
  });
};
