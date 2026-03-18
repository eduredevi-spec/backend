import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * Income/expense category. userId null means it is a system default
 * available to all users. Supports one level of nesting via parentId.
 * keywords array powers auto-categorisation of imported transactions.
 */
const categorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    icon: { type: String, default: 'tag' },
    color: { type: String, default: '#2D5BFF' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    isSystem: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    keywords: [{ type: String }],
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.plugin(toJSONPlugin);

categorySchema.index({ userId: 1, type: 1, isHidden: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ keywords: 'text' });

export const Category = mongoose.model('Category', categorySchema);
