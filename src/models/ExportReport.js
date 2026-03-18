import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

/**
 * Tracks a user-requested export job (CSV, PDF, Excel).
 * The jobs worker processes pending exports, uploads to cloud storage,
 * and updates status + fileUrl. The expiresAt TTL index auto-purges
 * the record (and should trigger cloud file cleanup) after 7 days.
 */
const exportReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['csv', 'pdf', 'excel'] },
    dateRange: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    fileUrl: { type: String, default: null },
    fileName: { type: String },
    fileSize: { type: Number },
    errorMessage: { type: String, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

exportReportSchema.plugin(toJSONPlugin);

exportReportSchema.index({ userId: 1, createdAt: -1 });
exportReportSchema.index({ status: 1 });
exportReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ExportReport = mongoose.model('ExportReport', exportReportSchema);
