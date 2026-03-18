import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * Tracks a loan or debt the user owes (EMI, personal loan, credit card
 * balance, mortgage, etc.). Payment history is stored as an embedded array.
 * remainingBalance should be updated on each payment.
 */
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String, maxlength: 200 },
  },
  { _id: true }
);

const debtSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: {
      type: String,
      required: true,
      enum: ['emi', 'personal_loan', 'credit_card_debt', 'mortgage', 'other'],
    },
    principal: { type: mongoose.Schema.Types.Decimal128, required: true },
    remainingBalance: { type: mongoose.Schema.Types.Decimal128, required: true },
    interestRate: { type: Number, default: 0 },
    emiAmount: { type: mongoose.Schema.Types.Decimal128, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    lenderName: { type: String, maxlength: 100 },
    linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    status: { type: String, enum: ['active', 'paid_off', 'defaulted'], default: 'active' },
    payments: { type: [paymentSchema], default: [] },
    note: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

debtSchema.plugin(toJSONPlugin);

debtSchema.index({ userId: 1, status: 1 });
debtSchema.index({ userId: 1, type: 1 });

export const Debt = mongoose.model('Debt', debtSchema);
