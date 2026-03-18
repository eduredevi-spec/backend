# Money Manager — Backend API

REST API for the Money Manager personal finance app. Built with Node.js, Express 5, and MongoDB. Serves both the web and mobile clients.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [Auth System Deep Dive](#auth-system-deep-dive)
- [Code Conventions](#code-conventions)
- [Adding a New Feature Module](#adding-a-new-feature-module)

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy the example env file and fill in your values
cp .env.example .env

# Start in development (auto-restarts on file change)
npm run dev

# Start in production
npm start
```

The server starts on `http://localhost:3000` by default. Health check: `GET /api/v1/health`.

---

## Environment Variables

All variables are defined in `.env.example`. Copy it to `.env` before starting.

| Variable             | Required  | Description                                      |
| -------------------- | --------- | ------------------------------------------------ |
| `PORT`               | No        | Server port (default `3000`)                     |
| `NODE_ENV`           | No        | `development` or `production`                    |
| `MONGODB_URI`        | Yes       | MongoDB connection string                        |
| `JWT_ACCESS_SECRET`  | Yes       | Secret for signing access tokens                 |
| `JWT_REFRESH_SECRET` | Yes       | Secret for signing refresh tokens                |
| `CORS_ORIGIN`        | No        | Allowed origin (default `http://localhost:3001`) |
| `EMAIL_HOST`         | For reset | SMTP host                                        |
| `EMAIL_PORT`         | For reset | SMTP port (default `587`)                        |
| `EMAIL_USER`         | For reset | SMTP username                                    |
| `EMAIL_PASS`         | For reset | SMTP password                                    |
| `EMAIL_FROM`         | For reset | From address in sent emails                      |

> Use long, random strings for JWT secrets in production. Access tokens expire in 15 minutes, refresh tokens in 30 days.

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── index.js            # Reads process.env, exports typed config object
│   │
│   ├── constants/
│   │   ├── httpStatus.js       # HTTP_STATUS object (OK, CREATED, NOT_FOUND, ...)
│   │   ├── errorCodes.js       # ERROR_CODES strings (INVALID_CREDENTIALS, TOKEN_EXPIRED, ...)
│   │   └── index.js            # Re-exports both
│   │
│   ├── models/                 # Mongoose schemas (one file per model)
│   │   ├── plugins/
│   │   │   └── toJSON.js       # Shared plugin: converts Decimal128→string, strips __v
│   │   ├── User.js
│   │   ├── Account.js
│   │   ├── Category.js
│   │   ├── Transaction.js
│   │   ├── Budget.js
│   │   ├── SavingsGoal.js
│   │   ├── Debt.js
│   │   ├── RecurringRule.js
│   │   ├── Notification.js
│   │   ├── Family.js
│   │   ├── AuditLog.js
│   │   ├── ExportReport.js
│   │   ├── RefreshToken.js
│   │   └── index.js            # Re-exports all 13 models
│   │
│   ├── modules/                # Feature modules — one folder per resource
│   │   └── auth/
│   │       ├── auth.routes.js      # Express Router — maps URLs to controller methods
│   │       ├── auth.controller.js  # Thin: extracts req data, calls service, sends response
│   │       ├── auth.service.js     # All business logic lives here
│   │       └── auth.validation.js  # Joi schemas for every route's input
│   │
│   ├── middleware/
│   │   ├── authenticate.js     # Verifies Bearer token, loads user, sets req.user
│   │   ├── validate.js         # Joi validation middleware factory
│   │   ├── errorHandler.js     # Central error handler (last middleware in app.js)
│   │   ├── rateLimiter.js      # Placeholder — add express-rate-limit
│   │   └── planLimiter.js      # Placeholder — enforce per-plan resource caps
│   │
│   ├── shared/                 # Framework-level helpers used across all modules
│   │   ├── ApiError.js         # Custom error class with static factory methods
│   │   ├── ApiResponse.js      # Standard success/error response senders
│   │   ├── catchAsync.js       # Wraps async handlers so errors reach errorHandler
│   │   ├── paginate.js         # Cursor-based pagination helper
│   │   ├── pick.js             # Picks specific keys from an object
│   │   └── index.js            # Re-exports all
│   │
│   ├── utils/                  # Stateless helper functions
│   │   ├── token.js            # JWT sign/verify for access + refresh tokens
│   │   ├── password.js         # bcrypt hash + compare
│   │   ├── crypto.js           # Random tokens, UUID, SHA-256 hashing
│   │   ├── encryption.js       # AES-256-GCM field-level encryption
│   │   └── logger.js           # JSON logger with sensitive-field redaction
│   │
│   ├── services/               # External service integrations (to be built)
│   │   └── (email, push notifications, cloud storage, cache, audit log)
│   │
│   ├── jobs/                   # Background workers — BullMQ (to be built)
│   │   └── (recurring transactions, report generation)
│   │
│   ├── loaders/                # Startup functions called once by server.js
│   │   ├── express.js          # Applies all middleware (helmet, cors, morgan, ...)
│   │   ├── mongoose.js         # connectDB / disconnectDB
│   │   └── routes.js           # Mounts all module routers onto the app
│   │
│   ├── app.js                  # Creates Express app, calls loaders, NO listen()
│   └── server.js               # Connects DB, starts server, handles SIGTERM/SIGINT
│
├── .env.example                # Template — copy to .env
├── CLAUDE.md                   # AI assistant context file
└── package.json
```

---

## Architecture Overview

### Request lifecycle

```
HTTP Request
    │
    ▼
loaders/express.js middleware
    (helmet → cors → compression → morgan → express.json)
    │
    ▼
loaders/routes.js
    │
    ├─► auth router (/api/v1/auth/*)
    │       │
    │       ├─► validate(schema)       ← Joi validation, strips unknown fields
    │       ├─► authenticate           ← JWT verify + DB user load (protected routes only)
    │       └─► controller method
    │               │
    │               └─► service method ← All business logic
    │                       │
    │                       └─► Mongoose models
    │
    ▼
404 handler (unknown routes)
    │
    ▼
errorHandler (central — catches everything thrown upstream)
```

### Key design rules

- **Controllers never contain business logic.** They extract data from `req`, call a service, and call `ApiResponse`.
- **Services never touch `req` or `res`.** They receive plain data and return plain data (or throw `ApiError`).
- **All async handlers are wrapped with `catchAsync`** so thrown errors reach the central `errorHandler` without try/catch in every function.
- **All responses follow the same shape** — success or error — via `ApiResponse`.

### Two-token auth flow

```
Login / Register
    │
    ├─► issues  accessToken  (JWT, 15 min, signed with JWT_ACCESS_SECRET)
    └─► issues  refreshToken (JWT, 30 days, signed with JWT_REFRESH_SECRET)
                    │
                    └─► hash stored in RefreshToken collection (never stored raw)

Authenticated request
    └─► Bearer <accessToken> in Authorization header

When access token expires
    └─► POST /api/v1/auth/refresh-token  { refreshToken }
            │
            ├─► old token revoked in DB
            └─► new token pair issued (new familyId)

Reuse detection
    └─► if the old (revoked) refresh token is presented again,
        the entire token family is locked and a REFRESH_TOKEN_REUSE_DETECTED
        error is returned — all sessions for that login are killed
```

---

## Data Models

All 13 models are in `src/models/`. Every model:

- Has `timestamps: true` (`createdAt`, `updatedAt` auto-added)
- Uses the `toJSONPlugin` which converts `Decimal128` fields to strings and strips `__v`
- Uses **Decimal128 for every money/currency field** (never `Number`)
- Uses soft-delete (`deletedAt`) for financial records

| Model           | Purpose                                                                                | Money fields                                                    |
| --------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `User`          | App account. Supports local + OAuth. Has plan tier, lockout, reset token.              | —                                                               |
| `Account`       | Bank/cash/wallet/card/investment/loan account                                          | `balance`                                                       |
| `Category`      | Income/expense categories. Supports sub-categories and auto-categorisation keywords.   | —                                                               |
| `Transaction`   | Core financial event (income, expense, transfer). Has idempotency key.                 | `amount`                                                        |
| `Budget`        | Spending limit per category per period. Tracks `spent` and alert thresholds.           | `amount`, `spent`, `rolloverAmount`                             |
| `SavingsGoal`   | Savings target with embedded contribution history.                                     | `targetAmount`, `currentAmount`, contributions `amount`         |
| `Debt`          | Loan/EMI tracker with embedded payment history.                                        | `principal`, `remainingBalance`, `emiAmount`, payments `amount` |
| `RecurringRule` | Template for recurring transactions. Cron worker reads `nextOccurrence`.               | `amount`                                                        |
| `Notification`  | In-app notifications. TTL index auto-deletes after `expiresAt`.                        | —                                                               |
| `Family`        | Shared household group with role-based member access.                                  | —                                                               |
| `AuditLog`      | **Immutable** append-only audit trail. Never update or delete records.                 | —                                                               |
| `ExportReport`  | Tracks CSV/PDF/Excel export jobs. TTL index auto-deletes after 7 days.                 | —                                                               |
| `RefreshToken`  | Persisted refresh token hashes for rotation + reuse detection. TTL index auto-expires. | —                                                               |

---

## API Reference

### Base URL: `/api/v1`

### Auth — `/api/v1/auth`

| Method | Path               | Auth   | Body                               | Description                            |
| ------ | ------------------ | ------ | ---------------------------------- | -------------------------------------- |
| `POST` | `/register`        | —      | `{ name, email, password }`        | Create account, returns token pair     |
| `POST` | `/login`           | —      | `{ email, password }`              | Login, returns token pair              |
| `POST` | `/refresh-token`   | —      | `{ refreshToken }`                 | Rotate refresh token, returns new pair |
| `POST` | `/forgot-password` | —      | `{ email }`                        | Sends reset email (always 200)         |
| `POST` | `/reset-password`  | —      | `{ token, password }`              | Resets password using email token      |
| `POST` | `/logout`          | Bearer | `{ refreshToken? }`                | Revokes token (or all if omitted)      |
| `POST` | `/change-password` | Bearer | `{ currentPassword, newPassword }` | Changes password, revokes all sessions |

### Success response shape

```json
{
  "success": true,
  "data": { ... },
  "message": "Human readable message",
  "meta": { "timestamp": "2026-03-19T10:00:00.000Z" }
}
```

### Error response shape

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": []
  },
  "meta": { "timestamp": "2026-03-19T10:00:00.000Z" }
}
```

### Password requirements

- Minimum 8 characters, maximum 128
- Must contain at least one uppercase letter, one lowercase letter, and one number

---

## Auth System Deep Dive

### Account lockout

After **5 consecutive failed login attempts**, the account is locked for **15 minutes**. The lockout resets automatically after the duration, or immediately on a successful login.

### Refresh token security

- Raw refresh tokens are **never stored** in the database — only a bcrypt hash.
- Each login creates a new **familyId** (UUID). All tokens issued in one session share a familyId.
- On refresh, the old token is revoked and a new one is issued under a new familyId.
- If a **revoked token** is presented, the entire family is revoked immediately — this kills all active sessions from that login chain as a security measure.

### Password reset flow

1. `POST /forgot-password` with email → generates a random 64-char hex token, stores its **SHA-256 hash** in the user record (not bcrypt — SHA-256 is needed for DB lookup), sends the raw token via email (email sending is a TODO).
2. `POST /reset-password` with `{ token, password }` → hashes the token, finds the user by hash, verifies expiry (1 hour), updates password, revokes all refresh tokens.

---

## Code Conventions

### Response format

Always use `ApiResponse` — never call `res.json()` directly in controllers.

```js
// Success
ApiResponse.success(res, { data: result, message: "Done" });
ApiResponse.created(res, { data: newUser, message: "Account created" });
ApiResponse.noContent(res);

// Error (usually thrown, not called directly)
throw ApiError.unauthorized(
  "Access token has expired",
  ERROR_CODES.TOKEN_EXPIRED,
);
throw ApiError.notFound("Account not found");
throw new ApiError(
  HTTP_STATUS.CONFLICT,
  "Email already registered",
  ERROR_CODES.EMAIL_ALREADY_EXISTS,
);
```

### Validation

Every route that accepts input uses `validate({ body: joiSchema })`:

```js
// In auth.validation.js
export const createAccount = {
  body: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().required(),
  }),
};

// In auth.routes.js
router.post(
  "/",
  authenticate,
  validate(accountValidation.createAccount),
  controller.create,
);
```

### Money values

**Always use `Decimal128`** — never `Number` for any monetary field.

```js
// Creating a transaction
const amount = mongoose.Types.Decimal128.fromString(req.body.amount);

// In JSON responses, Decimal128 is auto-converted to string by toJSONPlugin
// { "amount": "1234.56" }  ← string, not number
```

### Soft deletes

Financial records (transactions, accounts, budgets, etc.) use `deletedAt` — never hard-delete them.

```js
// Soft delete
await Transaction.findByIdAndUpdate(id, { deletedAt: new Date() });

// Always filter deleted records in queries
await Transaction.find({ userId, deletedAt: null });
```

---

## Adding a New Feature Module

Each feature follows the same 4-file structure. Example: adding `accounts`.

**1. Create `src/modules/accounts/accounts.validation.js`**

```js
import Joi from "joi";

export const create = {
  body: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().required(),
  }),
};
```

**2. Create `src/modules/accounts/accounts.service.js`**

```js
import { Account } from "../../models/Account.js";
import { ApiError } from "../../shared/ApiError.js";

export const createAccount = async (userId, data) => {
  // All business logic here
  return Account.create({ userId, ...data });
};
```

**3. Create `src/modules/accounts/accounts.controller.js`**

```js
import { catchAsync } from "../../shared/catchAsync.js";
import * as ApiResponse from "../../shared/ApiResponse.js";
import * as accountsService from "./accounts.service.js";

export const create = catchAsync(async (req, res) => {
  const account = await accountsService.createAccount(req.user._id, req.body);
  return ApiResponse.created(res, {
    data: account,
    message: "Account created",
  });
});
```

**4. Create `src/modules/accounts/accounts.routes.js`**

```js
import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import * as accountsValidation from "./accounts.validation.js";
import * as accountsController from "./accounts.controller.js";

const router = Router();
router.post(
  "/",
  validate(accountsValidation.create),
  accountsController.create,
);
export default router;
```

**5. Register in `src/loaders/routes.js`**

```js
import accountsRouter from "../modules/accounts/accounts.routes.js";

// Inside loadRoutes:
app.use("/api/v1/accounts", authenticate, accountsRouter);
```
