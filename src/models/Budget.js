import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';
import { ALL_TRANSACTION_CATEGORY_KEYS } from '../constants/categories.js';

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { 
      type: String, 
      required: true,
      enum: ALL_TRANSACTION_CATEGORY_KEYS 
    },
    limitAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    idempotencyKey: { type: String, unique: true },
  },
  { timestamps: true }
);

budgetSchema.plugin(toJSONPlugin);

budgetSchema.index({ userId: 1, year: 1, month: 1, categoryId: 1 }, { unique: true });

export const Budget = mongoose.model('Budget', budgetSchema);
