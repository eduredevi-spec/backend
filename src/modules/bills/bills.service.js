import mongoose from 'mongoose';
import { Bill } from '../../models/Bill.js';
import { ApiError } from '../../shared/ApiError.js';

const toD128 = (value) =>
  mongoose.Types.Decimal128.fromString(String(Number(value)));

export const createBill = async (userId, billData) => {
  const { idempotencyKey } = billData;
  if (idempotencyKey) {
    const existing = await Bill.findOne({ userId, idempotencyKey });
    if (existing) return existing;
  }

  return await Bill.create({
    ...billData,
    userId,
    amount: toD128(billData.amount || 0),
  });
};

export const listBills = async (userId, query = {}) => {
  const { isPaid, limit = 50 } = query;
  const filter = { userId };
  if (isPaid !== undefined) filter.isPaid = isPaid;

  return await Bill.find(filter)
    .sort({ dueDate: 1 })
    .limit(limit);
};

export const updateBill = async (userId, billId, updateData) => {
  if (updateData.amount !== undefined) {
    updateData.amount = toD128(updateData.amount);
  }

  const bill = await Bill.findOneAndUpdate(
    { _id: billId, userId },
    updateData,
    { new: true, runValidators: true }
  );

  if (!bill) throw ApiError.notFound('Bill not found');
  return bill;
};

export const deleteBill = async (userId, billId) => {
  const bill = await Bill.findOneAndDelete({ _id: billId, userId });
  if (!bill) throw ApiError.notFound('Bill not found');
  return bill;
};

export const markAsPaid = async (userId, billId) => {
  const bill = await Bill.findOneAndUpdate(
    { _id: billId, userId },
    { isPaid: true, paidAt: new Date() },
    { new: true }
  );
  if (!bill) throw ApiError.notFound('Bill not found');
  return bill;
};
