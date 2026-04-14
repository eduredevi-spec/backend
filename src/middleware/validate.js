import { ApiError } from "../shared/ApiError.js";
import { ERROR_CODES } from "../constants/index.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * Middleware factory that validates req.body, req.params, and/or req.query
 * against the provided Joi schemas.
 *
 * @param {{ body?: JoiSchema, params?: JoiSchema, query?: JoiSchema }} schema
 *
 * @example
 * router.post('/register', validate({ body: registerBodySchema }), controller.register);
 */
export const validate = (schema) => (req, _res, next) => {
  const allErrors = [];
  const sanitized = {};

  for (const key of ["body", "params", "query"]) {
    if (!schema[key]) continue;

    const { error, value } = schema[key].validate(req[key], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message.replace(/['"]/g, ""),
      }));
      allErrors.push(...details);
    } else {
      sanitized[key] = value;
    }
  }

  if (allErrors.length > 0) {
    return next(
      new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Validation error",
        ERROR_CODES.VALIDATION_ERROR,
        allErrors,
      ),
    );
  }

  if (sanitized.body) {
    req.body = sanitized.body;
  }
  if (sanitized.params) {
    req.params = sanitized.params;
  }
  if (sanitized.query) {
    Object.defineProperty(req, "validatedQuery", {
      value: sanitized.query,
      configurable: true,
      enumerable: false,
      writable: false,
    });
  }

  next();
};
