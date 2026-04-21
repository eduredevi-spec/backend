import mongoose from "mongoose";
import { toJSONPlugin } from "./plugins/toJSON.js";
/**
 * The core financial event model. Records income, expenses, and account
 * transfers. Uses Decimal128 for amount. Soft-deleted via deletedAt.
 * idempotencyKey prevents duplicate submissions from clients.
 * All balance-affecting operations must run inside a MongoDB session.
 */
const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["income", "expense", "transfer"],
    },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    categoryId: {
      type: String,
      default: null,
    },
    date: { type: Date, required: true, default: Date.now },
    payee: { type: String, trim: true, maxlength: 100 },
    note: { type: String, maxlength: 500 },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= 10,
        message: "Tags cannot exceed 10 items",
      },
    },
    receiptUrl: { type: String, default: null },
    location: { type: String, maxlength: 100 },
    recurringRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringRule",
      default: null,
    },
    idempotencyKey: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

transactionSchema.plugin(toJSONPlugin);

// Performance-critical indexes for dashboard and report queries
transactionSchema.index({ userId: 1, date: -1, deletedAt: 1 });
transactionSchema.index({ userId: 1, accountId: 1, date: -1 });
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, tags: 1 });
transactionSchema.index({ recurringRuleId: 1 });
transactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
