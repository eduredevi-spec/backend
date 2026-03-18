import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * A spending limit for a category over a time period.
 * spent is updated by the transaction service (not calculated on-the-fly).
 * alertsSent tracks which percentage thresholds have already triggered a push.
 */
const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    spent: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    period: { type: String, required: true, enum: ['weekly', 'monthly', 'yearly'] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    rollover: { type: Boolean, default: false },
    rolloverAmount: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    alertThresholds: { type: [Number], default: [50, 80, 100] },
    alertsSent: { type: [Number], default: [] },
    isActive: { type: Boolean, default: true },
    note: { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

budgetSchema.plugin(toJSONPlugin);

budgetSchema.index({ userId: 1, isActive: 1, period: 1 });
budgetSchema.index({ userId: 1, categoryId: 1, startDate: 1, endDate: 1 });

export const Budget = mongoose.model('Budget', budgetSchema);
