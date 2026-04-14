import mongoose from 'mongoose';
import { Transaction } from '../../models/Transaction.js';
import { Account } from '../../models/Account.js';
import { AuditLog } from '../../models/AuditLog.js';
import { adjustAccountBalance } from '../accounts/accounts.service.js';
import { ApiError } from '../../shared/ApiError.js';
import { TRANSACTION_CATEGORY_KEYS } from '../../constants/categories.js';

// ─── Decimal128 helpers ───────────────────────────────────────────────────────

/** Converts a number or numeric string to Decimal128. */
const toD128 = (value) =>
  mongoose.Types.Decimal128.fromString(String(Number(value)));

/** Adds two Decimal128 values, returns Decimal128. */
const addD128 = (a, b) =>
  toD128(parseFloat(a.toString()) + parseFloat(b.toString()));

/** Subtracts b from a (both Decimal128), returns Decimal128. */
const subD128 = (a, b) =>
  toD128(parseFloat(a.toString()) - parseFloat(b.toString()));

// ─── Cursor helpers ───────────────────────────────────────────────────────────

/**
 * Encodes a document's date + _id into a base64url cursor string.
 * Using compound date+id ensures stable pagination even when multiple
 * transactions share the same date.
 */
const encodeCursor = (doc) =>
  Buffer.from(JSON.stringify({ date: doc.date, id: String(doc._id) })).toString('base64url');

const decodeCursor = (cursor) => {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString());
  } catch {
    throw ApiError.badRequest('Invalid pagination cursor');
  }
};

// ─── Balance adjustment ───────────────────────────────────────────────────────

/**
 * Applies or reverses a transaction's effect on account balance(s).
 * direction = 1  → apply   (used when creating)
 * direction = -1 → reverse (used when updating or deleting)
 *
 * All DB operations run inside the provided Mongoose session.
 */
const adjustBalances = async (tx, direction, session) => {
  const amount = parseFloat(tx.amount.toString()) * direction;

  if (tx.type === 'income') {
    await adjustAccountBalance(tx.userId, tx.accountId, amount, session);

  } else if (tx.type === 'expense') {
    await adjustAccountBalance(tx.userId, tx.accountId, -amount, session);

  } else if (tx.type === 'transfer') {
    await adjustAccountBalance(tx.userId, tx.accountId, -amount, session);
    await adjustAccountBalance(tx.userId, tx.toAccountId, amount, session);
  }
};

// ─── Reference validators ─────────────────────────────────────────────────────

/** Verifies the account exists, belongs to the user, and is not archived. */
const validateAccount = async (accountId, userId) => {
  const account = await Account.findOne({ _id: accountId, userId, isArchived: false });
  if (!account) throw ApiError.notFound(`Account not found or not accessible`);
  return account;
};

/**
 * Verifies the category exists and is accessible (owned by user or system),
 * and that its type matches the transaction type.
 */
const validateCategory = async (categoryId, txType) => {
  const allowed = TRANSACTION_CATEGORY_KEYS[txType] ?? [];
  if (!allowed.includes(categoryId)) {
    throw ApiError.badRequest(
      `Category "${categoryId}" does not match transaction type "${txType}"`
    );
  }
};

// ─── Audit log helper ─────────────────────────────────────────────────────────

const writeAuditLog = (userId, action, entityId, changes, session) =>
  AuditLog.create(
    [{ userId, action, entityType: 'transaction', entityId, changes }],
    { session }
  );

// ─── Populate config ──────────────────────────────────────────────────────────

const POPULATE = [
  { path: 'accountId',   select: 'name type currency' },
  { path: 'toAccountId', select: 'name type currency' },
];

// ─── Public service functions ─────────────────────────────────────────────────

/**
 * Creates a transaction and atomically adjusts account balance(s).
 * Idempotency: if idempotencyKey already exists, returns the existing transaction.
 */
export const createTransaction = async (userId, data) => {
  const {
    type, amount, accountId, toAccountId, categoryId,
    idempotencyKey, ...rest
  } = data;

  // Idempotency check — return existing record without creating a duplicate
  if (idempotencyKey) {
    const existing = await Transaction.findOne({ idempotencyKey }).populate(POPULATE);
    if (existing) return existing;
  }

  // Validate referenced documents
  await validateAccount(accountId, userId);
  if (type === 'transfer') {
    if (!toAccountId) throw ApiError.badRequest('toAccountId is required for transfers');
    if (String(toAccountId) === String(accountId))
      throw ApiError.badRequest('Transfer source and destination accounts must be different');
    await validateAccount(toAccountId, userId);
  }
  if (type !== 'transfer' && categoryId) {
    await validateCategory(categoryId, type);
  }

  let tx;
  await mongoose.connection.transaction(async (session) => {
    const [created] = await Transaction.create(
      [{
        userId,
        type,
        amount: toD128(amount),
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : null,
        categoryId: type !== 'transfer' ? (categoryId || null) : null,
        idempotencyKey: idempotencyKey || null,
        ...rest,
      }],
      { session }
    );
    tx = created;

    await adjustBalances(tx, 1, session);
    await writeAuditLog(userId, 'create', tx._id, { after: tx.toObject() }, session);
  });

  return tx.populate(POPULATE);
};

/**
 * Returns a cursor-paginated list of the user's transactions.
 * Supports filtering by type, accountId, categoryId, date range, tags, and text search.
 * Sorted by date descending with _id as tiebreaker for stable pagination.
 */
export const listTransactions = async (userId, filters = {}) => {
  const {
    cursor, limit = 20, type, accountId, categoryId,
    dateFrom, dateTo, tags, search,
  } = filters;

  // Build base filter
  const base = { userId, deletedAt: null };
  if (type) base.type = type;
  if (accountId) base.accountId = accountId;
  if (categoryId) base.categoryId = categoryId;
  if (dateFrom || dateTo) {
    base.date = {};
    if (dateFrom) base.date.$gte = new Date(dateFrom);
    if (dateTo)   base.date.$lte = new Date(dateTo);
  }
  if (tags) {
    const tagList = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
    base.tags = { $in: tagList };
  }

  // Collect $or-based conditions separately to avoid conflicts
  const andConditions = [base];

  if (search) {
    andConditions.push({
      $or: [
        { payee: { $regex: search, $options: 'i' } },
        { note:  { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (cursor) {
    const { date, id } = decodeCursor(cursor);
    andConditions.push({
      $or: [
        { date: { $lt: new Date(date) } },
        { date: new Date(date), _id: { $lt: new mongoose.Types.ObjectId(id) } },
      ],
    });
  }

  const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];
  const pageLimit = Number(limit);

  const docs = await Transaction.find(query)
    .sort({ date: -1, _id: -1 })
    .limit(pageLimit + 1)
    .populate(POPULATE);

  const hasMore = docs.length > pageLimit;
  if (hasMore) docs.pop();

  return {
    data: docs,
    meta: {
      hasMore,
      nextCursor: hasMore ? encodeCursor(docs[docs.length - 1]) : null,
      count: docs.length,
    },
  };
};

/**
 * Returns a single transaction by ID, scoped to the authenticated user.
 */
export const getTransaction = async (userId, transactionId) => {
  const tx = await Transaction
    .findOne({ _id: transactionId, userId, deletedAt: null })
    .populate(POPULATE);

  if (!tx) throw ApiError.notFound('Transaction not found');
  return tx;
};

/**
 * Updates a transaction and atomically recalculates balance changes.
 * Reverses the original balance effect, then applies the updated effect.
 */
export const updateTransaction = async (userId, transactionId, data) => {
  const existing = await Transaction.findOne({ _id: transactionId, userId, deletedAt: null });
  if (!existing) throw ApiError.notFound('Transaction not found');

  const { type, amount, accountId, toAccountId, categoryId, ...rest } = data;

  // Merge incoming fields with existing values
  const newType      = type      ?? existing.type;
  const newAccountId = accountId ?? existing.accountId;
  const newToAccId   = toAccountId !== undefined ? toAccountId : existing.toAccountId;
  const newAmount    = amount    !== undefined ? toD128(amount) : existing.amount;
  const newCatId     = categoryId !== undefined ? categoryId : existing.categoryId;

  // Validate any changed references
  if (accountId) await validateAccount(accountId, userId);
  if (newType === 'transfer') {
    const resolvedToId = newToAccId || existing.toAccountId;
    if (!resolvedToId) throw ApiError.badRequest('toAccountId is required for transfers');
    if (String(resolvedToId) === String(newAccountId))
      throw ApiError.badRequest('Transfer source and destination accounts must be different');
    await validateAccount(resolvedToId, userId);
  }
  if (newType !== 'transfer' && newCatId) {
    await validateCategory(newCatId, newType);
  }

  const before = existing.toObject();

  await mongoose.connection.transaction(async (session) => {
    // 1. Reverse the old transaction's balance effect
    await adjustBalances(existing, -1, session);

    // 2. Apply updates to the document
    Object.assign(existing, rest);
    existing.type        = newType;
    existing.amount      = newAmount;
    existing.accountId   = newAccountId;
    existing.toAccountId = newType === 'transfer' ? (newToAccId || existing.toAccountId) : null;
    existing.categoryId  = newType !== 'transfer' ? (newCatId || null) : null;
    await existing.save({ session });

    // 3. Apply the new balance effect
    await adjustBalances(existing, 1, session);

    await writeAuditLog(
      userId, 'update', existing._id,
      { before, after: existing.toObject() },
      session
    );
  });

  return existing.populate(POPULATE);
};

/**
 * Soft-deletes a transaction and reverses its balance effect atomically.
 */
export const deleteTransaction = async (userId, transactionId) => {
  const tx = await Transaction.findOne({ _id: transactionId, userId, deletedAt: null });
  if (!tx) throw ApiError.notFound('Transaction not found');

  await mongoose.connection.transaction(async (session) => {
    await adjustBalances(tx, -1, session);

    tx.deletedAt = new Date();
    await tx.save({ session });

    await writeAuditLog(userId, 'delete', tx._id, { before: tx.toObject() }, session);
  });
};
