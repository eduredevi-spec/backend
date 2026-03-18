import mongoose from "mongoose";
import { toJSONPlugin } from "./plugins/toJSON.js";

/**
 * Persisted refresh token for JWT rotation. The raw token is NEVER stored —
 * only a bcrypt hash (tokenHash). familyId groups all tokens from the same
 * login session so that reuse of a rotated token can invalidate the whole family
 * (refresh token rotation with reuse detection).
 * The expiresAt TTL index auto-removes expired tokens without a cleanup job.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenHash: { type: String, required: true },
    familyId: { type: String, required: true },
    deviceInfo: {
      userAgent: { type: String },
      ip: { type: String },
      deviceName: { type: String },
    },
    isRevoked: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

refreshTokenSchema.plugin(toJSONPlugin);

refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ familyId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
