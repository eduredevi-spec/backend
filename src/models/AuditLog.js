import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * Immutable audit trail for all create/update/delete events on financial data.
 * NEVER update or delete documents in this collection — append only.
 * changes.before/after store the full document snapshots as Mixed so nothing is lost.
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'login', 'logout'],
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'transaction',
        'account',
        'budget',
        'category',
        'savings_goal',
        'debt',
        'recurring_rule',
        'user',
      ],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.plugin(toJSONPlugin);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
