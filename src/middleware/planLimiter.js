import { ApiError } from '../shared/ApiError.js';
import { HTTP_STATUS, ERROR_CODES } from '../constants/index.js';

// Usage: planLimiter('accounts') — checks req.user.plan against PLAN_LIMITS
// TODO: define PLAN_LIMITS in src/constants/ once plan tiers are finalised
export const planLimiter = (_resource) => (_req, _res, next) => next();
