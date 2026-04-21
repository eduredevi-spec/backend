import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

const billSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true, default: 0 },
    dueDate: { type: Date, required: true },
    categoryId: { type: String }, // Optional link to category
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    note: { type: String, maxlength: 200 },
    idempotencyKey: { type: String, index: true },
  },
  { timestamps: true }
);

billSchema.plugin(toJSONPlugin);

billSchema.index({ userId: 1, dueDate: 1 });
billSchema.index({ userId: 1, isPaid: 1 });

export const Bill = mongoose.model('Bill', billSchema);
