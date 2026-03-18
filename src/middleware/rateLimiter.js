// TODO: install express-rate-limit and implement per-route limits
// import rateLimit from 'express-rate-limit';
// export const rateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

export const rateLimiter = (_req, _res, next) => next();
