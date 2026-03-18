# Money Manager — Backend API

## About

Personal finance app backend. REST API serving web and mobile clients.

## Tech Stack

- Node.js + Express 5
- MongoDB + Mongoose (Decimal128 for all money fields)
- JWT authentication (bcryptjs + jsonwebtoken)
- Joi for request validation
- Morgan for logging, Helmet for security, Compression for performance

## Project Structure

src/
config/ — Environment config (database, auth, cors)
constants/ — Enums, error codes, HTTP status, plan limits
models/ — Mongoose schemas (User, Account, Transaction, Budget, etc.)
modules/ — Feature modules, each with: routes, controller, service, validation, test
middleware/ — authenticate, validate, errorHandler, rateLimiter, planLimiter
shared/ — ApiError, ApiResponse, catchAsync, paginate
utils/ — logger, password hashing, token helpers, encryption
services/ — External integrations (cache, email, push, storage, audit log)
jobs/ — BullMQ background workers (recurring transactions, reports)
loaders/ — App startup (express, mongoose, redis, routes)
app.js — Express app setup (middleware + routes, NO listen)
server.js — Entry point (connects DB, starts server, graceful shutdown)

## Code Conventions

- Business logic ONLY in service files, never in controllers
- Controllers: extract request data, call service, return ApiResponse
- All money values: Mongoose Decimal128 (never Number/Float)
- Soft deletes only for financial data (deletedAt timestamp)
- Standard response: { success, data, message, meta }
- Standard error: { success, error: { code, message, details }, meta }
- Cursor-based pagination (not offset)
- MongoDB transactions for all balance-affecting operations
- Audit log for every create/update/delete on financial records
- Never log passwords, tokens, or full emails

## API Format

- Base URL: /api/v1
- Auth: JWT Bearer token in Authorization header
- Versioned routes: /api/v1/auth, /api/v1/accounts, /api/v1/transactions

## Current Phase

MVP (Phase 1) — Building: config, shared utilities, auth, accounts, categories, transactions, budgets, dashboard
