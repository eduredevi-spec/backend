import mongoose from "mongoose";
import { toJSONPlugin } from "./plugins/toJSON.js";

const pendingUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: { 
      type: String, 
      required: true 
    },
    otpHash: { 
      type: String, 
      required: true 
    },
    otpExpires: { 
      type: Date, 
      required: true 
    },
    attempts: { 
      type: Number, 
      default: 0 
    },
    lastSentAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { timestamps: true },
);

// Auto-delete after 1 hour if not verified
pendingUserSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });
// Index email for quick lookup
pendingUserSchema.index({ email: 1 });

pendingUserSchema.plugin(toJSONPlugin);

export const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
