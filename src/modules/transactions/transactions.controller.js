import { catchAsync } from '../../shared/catchAsync.js';
import * as ApiResponse from '../../shared/ApiResponse.js';
import * as transactionsService from './transactions.service.js';

/**
 * POST /api/v1/transactions
 * Creates a transaction and adjusts account balance(s).
 */
export const create = catchAsync(async (req, res) => {
  const tx = await transactionsService.createTransaction(req.user._id, req.body);
  return ApiResponse.created(res, { data: tx, message: 'Transaction created' });
});

/**
 * GET /api/v1/transactions
 * Returns a cursor-paginated, filterable list of the user's transactions.
 */
export const list = catchAsync(async (req, res) => {
  const result = await transactionsService.listTransactions(
    req.user._id,
    req.validatedQuery ?? req.query
  );
  return ApiResponse.success(res, { data: result.data, meta: result.meta });
});

/**
 * GET /api/v1/transactions/:id
 * Returns a single transaction.
 */
export const getById = catchAsync(async (req, res) => {
  const tx = await transactionsService.getTransaction(req.user._id, req.params.id);
  return ApiResponse.success(res, { data: tx });
});

/**
 * PATCH /api/v1/transactions/:id
 * Updates a transaction and recalculates affected account balances.
 */
export const update = catchAsync(async (req, res) => {
  const tx = await transactionsService.updateTransaction(req.user._id, req.params.id, req.body);
  return ApiResponse.success(res, { data: tx, message: 'Transaction updated' });
});

/**
 * DELETE /api/v1/transactions/:id
 * Soft-deletes a transaction and reverses its balance effect.
 */
export const remove = catchAsync(async (req, res) => {
  await transactionsService.deleteTransaction(req.user._id, req.params.id);
  return ApiResponse.noContent(res);
});
