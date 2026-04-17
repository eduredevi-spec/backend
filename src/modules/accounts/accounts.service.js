import mongoose from 'mongoose';
import { Account } from '../../models/Account.js';
import { ApiError } from '../../shared/ApiError.js';

// ─── Decimal128 helpers ───────────────────────────────────────────────────────

/** Converts a number or numeric string to Decimal128. */
const toD128 = (value) =>
  mongoose.Types.Decimal128.fromString(String(Number(value)));

/**
 * Creates a new account for the user.
 */
export const createAccount = async (userId, accountData) => {
  const { idempotencyKey } = accountData;

  if (idempotencyKey) {
    const existing = await Account.findOne({ userId, idempotencyKey });
    if (existing) return existing;
  }

  const account = await Account.create({
    ...accountData,
    userId,
    balance: toD128(accountData.balance || 0),
  });
  return account;
};

/**
 * Lists accounts for the user with optional filtering.
 */
export const listAccounts = async (userId, query = {}) => {
  const {
    type,
    includeArchived = false,
    limit = 50,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
  } = query;

  const filter = { userId };
  if (!includeArchived) {
    filter.isArchived = false;
  }
  if (type) {
    filter.type = type;
  }

  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const accounts = await Account.find(filter)
    .sort(sort)
    .limit(limit);

  return accounts;
};

/**
 * Gets a single account by ID, ensuring it belongs to the user.
 */
export const getAccount = async (userId, accountId) => {
  const account = await Account.findOne({ _id: accountId, userId });
  if (!account) {
    throw ApiError.notFound('Account not found');
  }
  return account;
};

/**
 * Updates an account, ensuring it belongs to the user.
 */
export const updateAccount = async (userId, accountId, updateData) => {
  // Convert balance to Decimal128 if provided
  if (updateData.balance !== undefined) {
    updateData.balance = toD128(updateData.balance);
  }

  const account = await Account.findOneAndUpdate(
    { _id: accountId, userId },
    updateData,
    { new: true, runValidators: true }
  );

  if (!account) {
    throw ApiError.notFound('Account not found');
  }

  return account;
};

/**
 * Soft-deletes an account by archiving it.
 */
export const deleteAccount = async (userId, accountId) => {
  const account = await Account.findOneAndUpdate(
    { _id: accountId, userId },
    { isArchived: true },
    { new: true }
  );

  if (!account) {
    throw ApiError.notFound('Account not found');
  }

  return account;
};

/**
 * Adjusts an account's balance by a given amount.
 * Used internally by transaction operations.
 */
export const adjustAccountBalance = async (userId, accountId, amount, session = null) => {
  const adjustment = toD128(amount);
  const updateOptions = session ? { session } : {};

  const account = await Account.findOneAndUpdate(
    { _id: accountId, userId },
    { $inc: { balance: adjustment } },
    { new: true, ...updateOptions }
  );

  if (!account) {
    throw ApiError.notFound('Account not found');
  }

  return account;
};