import mongoose from 'mongoose';
import { Budget } from '../../models/Budget.js';
import { ApiError } from '../../shared/ApiError.js';

const toD128 = (value) => mongoose.Types.Decimal128.fromString(String(Number(value)));

export const createBudget = async (userId, data) => {
  const { categoryId, limitAmount, month, year, idempotencyKey } = data;

  if (idempotencyKey) {
    const existing = await Budget.findOne({ idempotencyKey });
    if (existing) return existing;
  }

  // Update if exists for the same month/year/category, or create new
  const budget = await Budget.findOneAndUpdate(
    { userId, categoryId, month, year },
    {
      limitAmount: toD128(limitAmount),
      idempotencyKey: idempotencyKey || null,
    },
    { new: true, upsert: true, runValidators: true }
  );

  return budget;
};

export const listBudgets = async (userId, filters = {}) => {
  const { year, month } = filters;
  const query = { userId };
  if (year) query.year = Number(year);
  if (month) query.month = Number(month);

  return Budget.find(query).sort({ year: -1, month: -1 });
};

export const deleteBudget = async (userId, budgetId) => {
  const budget = await Budget.findOneAndDelete({ _id: budgetId, userId });
  if (!budget) throw ApiError.notFound('Budget not found');
};
