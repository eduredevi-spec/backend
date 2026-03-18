import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * Defines a recurring transaction template (salary, rent, subscriptions).
 * The jobs/recurring worker queries { isActive: true, nextOccurrence: { $lte: now } }
 * and creates a Transaction for each due rule, then updates nextOccurrence.
 * autoPost false means the user must manually approve each occurrence.
 */
const recurringRuleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, required: true, enum: ['income', 'expense', 'transfer'] },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    frequency: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    nextOccurrence: { type: Date, required: true },
    lastProcessedAt: { type: Date, default: null },
    autoPost: { type: Boolean, default: true },
    payee: { type: String, maxlength: 100 },
    note: { type: String, maxlength: 300 },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= 10,
        message: 'Tags cannot exceed 10 items',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringRuleSchema.plugin(toJSONPlugin);

// Primary index for the cron worker
recurringRuleSchema.index({ isActive: 1, nextOccurrence: 1 });
recurringRuleSchema.index({ userId: 1, isActive: 1 });

export const RecurringRule = mongoose.model('RecurringRule', recurringRuleSchema);
