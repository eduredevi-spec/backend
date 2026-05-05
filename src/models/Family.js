import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * A shared household/family group. The owner can invite members via the
 * 6-char inviteCode. Members can have admin, editor, or viewer roles
 * that control what they can do with sharedBudgets.
 */
const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const familySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
    inviteCode: { type: String },
    sharedBudgets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Budget' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

familySchema.plugin(toJSONPlugin);

familySchema.index({ ownerId: 1 });
familySchema.index({ inviteCode: 1 }, { unique: true });
familySchema.index({ 'members.userId': 1 });

export const Family = mongoose.model('Family', familySchema);
