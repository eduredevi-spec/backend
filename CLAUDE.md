# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

Personal finance app backend. REST API serving web and mobile clients.

## Tech Stack

- Node.js (ESM — `"type": "module"`, use `import`/`export` everywhere) + Express 5
- MongoDB + Mongoose 9 (Decimal128 for all money fields — never Number/Float)
- JWT auth: access token (15m, `JWT_ACCESS_SECRET`) + refresh token (30d, `JWT_REFRESH_SECRET`)
- Joi for request validation, bcryptjs for passwords/refresh token hashes
- Morgan, Helmet, Compression middleware

## Running the App

```bash
npm run dev      # nodemon --env-file=.env src/server.js
npm start        # node --env-file=.env src/server.js
```

**Important:** Use `--env-file=.env` (Node 20.6+ native flag), not dotenv. ESM import order makes `dotenv/config` unreliable.

## Project Structure

```
src/
  config/       — Single default export config object (use config.mongodb.uri, config.port, etc.)
  constants/    — HTTP status codes, error codes, enums, plan limits
  models/       — Mongoose schemas; all export named + re-exported from models/index.js
  modules/      — Feature modules: routes, controller, service, validation (+ test)
  middleware/   — authenticate, validate, errorHandler, rateLimiter, planLimiter
  shared/       — ApiError, ApiResponse, catchAsync, pick
  utils/        — logger, password (bcrypt), token (JWT), crypto (sha256, uuid)
  loaders/      — App startup: express.js, mongoose.js, routes.js
  app.js        — Express app (middleware + routes, NO listen)
  server.js     — Entry point (connectDB → listen → graceful shutdown)
```

## Implemented Modules

| Module       | Routes                 | Status         |
| ------------ | ---------------------- | -------------- |
| auth         | `/api/v1/auth`         | ✅ Complete    |
| transactions | `/api/v1/transactions` | ✅ Complete    |
| accounts     | `/api/v1/accounts`     | 🔲 Not started |
| categories   | `/api/v1/categories`   | 🔲 Not started |
| budgets      | `/api/v1/budgets`      | 🔲 Not started |

## Code Conventions

- Business logic ONLY in service files, never in controllers
- Controllers: extract from `req`, call service, return `ApiResponse`
- All money values: Mongoose `Decimal128` — use `toD128()`, `addD128()`, `subD128()` helpers in service
- Soft deletes for all financial data (`deletedAt` timestamp, filter with `deletedAt: null`)
- MongoDB sessions + transactions for every balance-affecting operation
- Audit log (`AuditLog.create`) for every create/update/delete on financial records
- Cursor-based pagination: compound `date + _id` cursor, base64url encoded
- `$and` array to combine multiple `$or` filter conditions (avoids query conflicts)
- Standard response shape: `{ success, data, message, meta }`
- Standard error shape: `{ success, error: { code, message, details }, meta }`
- Never log passwords, tokens, or full emails

## Key Patterns

### Adding a new module

1. Create `src/modules/<name>/` with `routes.js`, `controller.js`, `service.js`, `validation.js`
2. Mount in `src/loaders/routes.js` with `authenticate` middleware
3. Validation schemas use `{ body, params, query }` object — passed to `validate()` middleware

### Config access

Always use default import: `import config from '../config/index.js'`
Then access: `config.mongodb.uri`, `config.port`, `config.jwt.accessSecret`, etc.
Named exports from config were removed by linter — do not rely on them.

### ApiResponse usage

```js
ApiResponse.success(res, { data, message, meta }); // 200
ApiResponse.created(res, { data, message }); // 201
ApiResponse.noContent(res); // 204
ApiResponse.error(res, { statusCode, code, message, details }); // any error
```

### ApiError static factories

```js
ApiError.badRequest(message);
ApiError.unauthorized(message);
ApiError.forbidden(message);
ApiError.notFound(message);
ApiError.conflict(message);
ApiError.internal(message);
```

## Known Gotchas

- **Mongoose unique sparse index**: use `partialFilterExpression` not `sparse: true` when some documents should be excluded from the unique index (e.g., OAuth users only). `sparse: true` still conflicts when the non-null field is always present.
- **Decimal128 arithmetic**: always `parseFloat(d128.toString())` → compute → `Decimal128.fromString(String(result))`. Never pass Decimal128 directly to arithmetic operators.
- **`toJSONPlugin`**: shared Mongoose plugin applied to all models — recursively converts Decimal128 → string, removes `__v` from responses.
- **Register validation commented out**: `validate(authValidation.register)` is currently disabled in `auth.routes.js` — registration accepts any input without validation.

## Current Phase

MVP (Phase 1) — auth ✅, transactions ✅ — next: accounts, categories, budgets, dashboard
