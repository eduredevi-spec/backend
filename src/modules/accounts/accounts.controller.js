import { catchAsync } from '../../shared/catchAsync.js';
import * as ApiResponse from '../../shared/ApiResponse.js';
import * as accountsService from './accounts.service.js';

/**
 * POST /api/v1/accounts
 * Creates a new account for the authenticated user.
 */
export const create = catchAsync(async (req, res) => {
  const account = await accountsService.createAccount(req.user._id, req.body);
  return ApiResponse.created(res, { data: account, message: 'Account created' });
});

/**
 * GET /api/v1/accounts
 * Returns a list of the user's accounts with optional filtering.
 */
export const list = catchAsync(async (req, res) => {
  const accounts = await accountsService.listAccounts(req.user._id, req.query);
  return ApiResponse.success(res, { data: accounts });
});

/**
 * GET /api/v1/accounts/:id
 * Returns a single account.
 */
export const getById = catchAsync(async (req, res) => {
  const account = await accountsService.getAccount(req.user._id, req.params.id);
  return ApiResponse.success(res, { data: account });
});

/**
 * PATCH /api/v1/accounts/:id
 * Updates an account.
 */
export const update = catchAsync(async (req, res) => {
  const account = await accountsService.updateAccount(req.user._id, req.params.id, req.body);
  return ApiResponse.success(res, { data: account, message: 'Account updated' });
});

/**
 * DELETE /api/v1/accounts/:id
 * Archives (soft-deletes) an account.
 */
export const remove = catchAsync(async (req, res) => {
  await accountsService.deleteAccount(req.user._id, req.params.id);
  return ApiResponse.noContent(res);
});