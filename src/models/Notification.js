import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * In-app notification delivered to a user. The expiresAt TTL index lets
 * MongoDB automatically purge old notifications without a cleanup job.
 * data is a flexible Mixed payload (e.g. { budgetId, percentage }).
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 100 },
    body: { type: String, required: true, maxlength: 500 },
    type: {
      type: String,
      required: true,
      enum: ['budget_alert', 'bill_reminder', 'goal_milestone', 'recurring_posted', 'system', 'security'],
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.plugin(toJSONPlugin);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = mongoose.model('Notification', notificationSchema);
