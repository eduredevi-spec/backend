import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * A savings target the user is working towards (holiday fund, emergency
 * fund, gadget, etc.). Contributions are stored as an embedded array so
 * progress history is always available without extra queries.
 */
const contributionSchema = new mongoose.Schema(
  {
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String, maxlength: 200 },
  },
  { _id: true }
);

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    targetAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
    currentAmount: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    targetDate: { type: Date, default: null },
    icon: { type: String, default: 'target' },
    color: { type: String, default: '#12B76A' },
    linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled'],
      default: 'active',
    },
    contributions: { type: [contributionSchema], default: [] },
  },
  { timestamps: true }
);

savingsGoalSchema.plugin(toJSONPlugin);

savingsGoalSchema.index({ userId: 1, status: 1 });
savingsGoalSchema.index({ userId: 1, targetDate: 1 });

export const SavingsGoal = mongoose.model('SavingsGoal', savingsGoalSchema);
