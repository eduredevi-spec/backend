import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * A financial account owned by a user (bank account, cash wallet,
 * credit card, investment portfolio, or loan).
 * balance uses Decimal128 to avoid floating-point precision errors.
 */
const accountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    type: {
      type: String,
      required: true,
      enum: ['bank', 'cash', 'wallet', 'credit_card', 'investment', 'loan'],
    },
    balance: { type: mongoose.Schema.Types.Decimal128, required: true, default: 0 },
    currency: { type: String, default: 'INR', maxlength: 3 },
    color: { type: String, default: '#2D5BFF' },
    icon: { type: String, default: 'wallet' },
    includeInTotal: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    note: { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

accountSchema.plugin(toJSONPlugin);

accountSchema.index({ userId: 1, isArchived: 1, sortOrder: 1 });
accountSchema.index({ userId: 1, type: 1 });

export const Account = mongoose.model('Account', accountSchema);
