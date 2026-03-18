import mongoose from "mongoose";
import { toJSONPlugin } from "./plugins/toJSON.js";

/**
 * Represents an app user. Supports local auth and OAuth (Google, Apple).
 * Password is optional because OAuth users will not have one.
 * Uses isActive + deletedAt for soft-delete; role for admin access.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, minlength: 8, select: false },

    avatar: { type: String, default: null },
    authProvider: {
      type: String,
      enum: ["local", "google", "apple"],
      default: "local",
    },
    authProviderId: { type: String, default: null },
    isEmailVerified: { type: Boolean, default: false },

    plan: { type: String, enum: ["free", "pro", "premium"], default: "free" },
    planExpiresAt: { type: Date, default: null },

    currency: { type: String, default: "INR", maxlength: 3 },
    language: { type: String, default: "en" },
    timezone: { type: String, default: "Asia/Kolkata" },

    pin: { type: String, default: null, select: false },

    lastLoginAt: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null },

    // kept for auth module compatibility
    role: { type: String, enum: ["user", "admin"], default: "user" },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.plugin(toJSONPlugin);

// Strip password even if it was explicitly selected
userSchema.methods.toJSON = function () {
  const obj = this.toObject({ transform: true });
  delete obj.password;
  delete obj.pin;
  return obj;
};

// Only index OAuth users (where authProviderId is an actual string).
// sparse:true alone doesn't help here because authProvider is always set ("local"),
// so a partial filter on authProviderId being a string is needed.
userSchema.index(
  { authProvider: 1, authProviderId: 1 },
  { unique: true, partialFilterExpression: { authProviderId: { $type: 'string' } } },
);
userSchema.index({ plan: 1, planExpiresAt: 1 });

export const User = mongoose.model("User", userSchema);
