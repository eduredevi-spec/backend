import { randomInt } from "crypto";
import config from "../../config/index.js";
import { User, RefreshToken, PendingUser } from "../../models/index.js";
import {
  sendEmailVerificationOtp,
  sendPasswordResetOtp,
} from "../../services/email.service.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { generateTokenPair, verifyRefreshToken } from "../../utils/token.js";
import {
  generateRandomToken,
  generateFamilyId,
  sha256Hash,
} from "../../utils/crypto.js";
import { ApiError } from "../../shared/ApiError.js";
import { HTTP_STATUS, ERROR_CODES } from "../../constants/index.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PASSWORD_RESET_EXPIRES_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_OTP_EXPIRES_MS = config.auth.emailOtpExpiresMinutes * 60 * 1000;
const EMAIL_OTP_RESEND_COOLDOWN_MS =
  config.auth.emailOtpResendCooldownSeconds * 1000;
const EMAIL_OTP_MAX_ATTEMPTS = config.auth.emailOtpMaxAttempts;
const EMAIL_OTP_LENGTH = config.auth.emailOtpLength;

/**
 * Returns the safe public user object included in auth responses.
 */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  plan: user.plan,
  currency: user.currency,
  isEmailVerified: user.isEmailVerified,
});

/**
 * Generates a numeric OTP code with the configured length.
 */
const generateNumericOtp = (length) =>
  Array.from({ length }, () => randomInt(0, 10)).join("");

/**
 * Hashes and stores OTP verification fields on the user, then sends the OTP email.
 */
const issueEmailVerificationOtp = async (user, { enforceCooldown = true } = {}) => {
  const now = Date.now();

  const lastSentAt = user.emailVerificationOtpLastSentAt || user.lastSentAt;

  if (
    enforceCooldown &&
    lastSentAt &&
    now - lastSentAt.getTime() < EMAIL_OTP_RESEND_COOLDOWN_MS
  ) {
    throw new ApiError(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      `Please wait ${config.auth.emailOtpResendCooldownSeconds} seconds before requesting another OTP`,
      ERROR_CODES.EMAIL_OTP_RATE_LIMITED,
    );
  }

  const otp = generateNumericOtp(EMAIL_OTP_LENGTH);
  const otpHash = sha256Hash(otp);
  const otpExpires = new Date(now + EMAIL_OTP_EXPIRES_MS);

  if (user instanceof User) {
    user.emailVerificationOtpHash = otpHash;
    user.emailVerificationOtpExpires = otpExpires;
    user.emailVerificationOtpAttempts = 0;
    user.emailVerificationOtpLastSentAt = new Date(now);
  } else {
    // PendingUser
    user.otpHash = otpHash;
    user.otpExpires = otpExpires;
    user.attempts = 0;
    user.lastSentAt = new Date(now);
  }
  
  await user.save();

  await sendEmailVerificationOtp({
    to: user.email,
    name: user.name,
    otp,
  });
};

/**
 * Hashes the raw refresh token and persists it in the RefreshToken collection.
 */
const persistRefreshToken = async (
  userId,
  rawToken,
  familyId,
  deviceInfo = {},
) => {
  const tokenHash = await hashPassword(rawToken);
  await RefreshToken.create({
    userId,
    tokenHash,
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS),
    deviceInfo,
  });
};

/**
 * Revokes every non-expired refresh token belonging to a familyId.
 */
const revokeFamily = async (familyId) => {
  await RefreshToken.updateMany({ familyId }, { isRevoked: true });
};

/**
 * Starts registration by creating a PendingUser. Account is only created after OTP verification.
 */
export const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "Email already registered",
      ERROR_CODES.EMAIL_ALREADY_EXISTS,
    );
  }

  // Check if there is already a pending registration for this email
  await PendingUser.deleteOne({ email });

  const hashed = await hashPassword(password);
  const otp = generateNumericOtp(EMAIL_OTP_LENGTH);
  const now = Date.now();

  const pendingUser = await PendingUser.create({
    name,
    email,
    password: hashed,
    otpHash: sha256Hash(otp),
    otpExpires: new Date(now + EMAIL_OTP_EXPIRES_MS),
    lastSentAt: new Date(now),
  });

  await sendEmailVerificationOtp({
    to: email,
    name,
    otp,
  });

  return {
    user: { name, email },
    verificationRequired: true,
  };
};

/**
 * Validates credentials, enforces lockout, and returns token pair on success.
 */
export const login = async ({ email, password }, deviceInfo = {}) => {
  const user = await User.findOne({ email, deletedAt: null }).select(
    "+password name email plan currency loginAttempts lockUntil lastLoginAt isActive isEmailVerified +emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpLastSentAt",
  );

  // Generic message to prevent email enumeration.
  if (!user) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Invalid email or password",
      ERROR_CODES.INVALID_CREDENTIALS,
    );
  }

  if (user.lockUntil && user.lockUntil > Date.now()) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Account is temporarily locked. Try again later",
      ERROR_CODES.ACCOUNT_LOCKED,
    );
  }

  const valid = await comparePassword(password, user.password);

  if (!valid) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCKOUT_MS);
    }
    await user.save();
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Invalid email or password",
      ERROR_CODES.INVALID_CREDENTIALS,
    );
  }

  if (!user.isEmailVerified) {
    const otpMissingOrExpired =
      !user.emailVerificationOtpHash ||
      !user.emailVerificationOtpExpires ||
      user.emailVerificationOtpExpires.getTime() <= Date.now();

    if (otpMissingOrExpired) {
      const cooldownElapsed =
        !user.emailVerificationOtpLastSentAt ||
        Date.now() - user.emailVerificationOtpLastSentAt.getTime() >=
          EMAIL_OTP_RESEND_COOLDOWN_MS;

      if (cooldownElapsed) {
        await issueEmailVerificationOtp(user, { enforceCooldown: false });
      }
    }

    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      "Email not verified. Please verify your email with OTP",
      ERROR_CODES.ACCOUNT_NOT_VERIFIED,
    );
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const familyId = generateFamilyId();
  const { accessToken, refreshToken } = generateTokenPair(user._id, familyId);
  await persistRefreshToken(user._id, refreshToken, familyId, deviceInfo);

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

/**
 * Verifies email using OTP. For new registrations, creates the final User account.
 */
export const verifyEmailOtp = async ({ email, otp }, deviceInfo = {}) => {
  // First check if it's a new registration (PendingUser)
  const pendingUser = await PendingUser.findOne({ email });
  
  if (pendingUser) {
    if (pendingUser.otpExpires.getTime() <= Date.now()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "OTP has expired. Please request a new one",
        ERROR_CODES.EMAIL_OTP_EXPIRED,
      );
    }

    if (pendingUser.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        "Maximum OTP attempts exceeded. Please request a new OTP",
        ERROR_CODES.EMAIL_OTP_ATTEMPTS_EXCEEDED,
      );
    }

    const otpHash = sha256Hash(otp);
    if (otpHash !== pendingUser.otpHash) {
      pendingUser.attempts += 1;
      await pendingUser.save();
      
      if (pendingUser.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
        throw new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          "Maximum OTP attempts exceeded. Please request a new OTP",
          ERROR_CODES.EMAIL_OTP_ATTEMPTS_EXCEEDED,
        );
      }

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid OTP",
        ERROR_CODES.EMAIL_OTP_INVALID,
      );
    }

    // OTP is valid! Create the real User.
    const user = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      isEmailVerified: true,
    });

    await PendingUser.deleteOne({ _id: pendingUser._id });

    const familyId = generateFamilyId();
    const { accessToken, refreshToken } = generateTokenPair(user._id, familyId);
    await persistRefreshToken(user._id, refreshToken, familyId, deviceInfo);

    return { 
      user: sanitizeUser(user), 
      accessToken, 
      refreshToken, 
      alreadyVerified: false 
    };
  }

  // If not in PendingUser, check the main User collection (for existing users resending OTP)
  const user = await User.findOne({ email, deletedAt: null }).select(
    "name email plan currency isEmailVerified +emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts +emailVerificationOtpLastSentAt",
  );

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "OTP is invalid or has expired",
      ERROR_CODES.EMAIL_OTP_INVALID,
    );
  }

  if (user.isEmailVerified) {
    return { user: sanitizeUser(user), alreadyVerified: true };
  }

  if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpires) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "OTP is invalid or has expired",
      ERROR_CODES.EMAIL_OTP_INVALID,
    );
  }

  if (user.emailVerificationOtpExpires.getTime() <= Date.now()) {
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpires = null;
    user.emailVerificationOtpAttempts = 0;
    await user.save();

    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "OTP has expired. Please request a new one",
      ERROR_CODES.EMAIL_OTP_EXPIRED,
    );
  }

  if (user.emailVerificationOtpAttempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    throw new ApiError(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      "Maximum OTP attempts exceeded. Please request a new OTP",
      ERROR_CODES.EMAIL_OTP_ATTEMPTS_EXCEEDED,
    );
  }

  const otpHash = sha256Hash(otp);
  if (otpHash !== user.emailVerificationOtpHash) {
    user.emailVerificationOtpAttempts += 1;
    await user.save();

    if (user.emailVerificationOtpAttempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        "Maximum OTP attempts exceeded. Please request a new OTP",
        ERROR_CODES.EMAIL_OTP_ATTEMPTS_EXCEEDED,
      );
    }

    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Invalid OTP",
      ERROR_CODES.EMAIL_OTP_INVALID,
    );
  }

  user.isEmailVerified = true;
  user.emailVerificationOtpHash = null;
  user.emailVerificationOtpExpires = null;
  user.emailVerificationOtpAttempts = 0;
  user.emailVerificationOtpLastSentAt = null;
  await user.save();

  const familyId = generateFamilyId();
  const { accessToken, refreshToken } = generateTokenPair(user._id, familyId);
  await persistRefreshToken(user._id, refreshToken, familyId, deviceInfo);

  return { 
    user: sanitizeUser(user), 
    accessToken, 
    refreshToken, 
    alreadyVerified: false 
  };
};

/**
 * Sends a fresh email verification OTP with resend cooldown.
 */
export const resendEmailVerificationOtp = async ({ email }) => {
  // Check PendingUser first
  const pendingUser = await PendingUser.findOne({ email });
  if (pendingUser) {
    await issueEmailVerificationOtp(pendingUser, { enforceCooldown: true });
    return;
  }

  const user = await User.findOne({ email, deletedAt: null }).select(
    "name email isEmailVerified +emailVerificationOtpLastSentAt +emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts",
  );

  if (!user || user.isEmailVerified) {
    return;
  }

  await issueEmailVerificationOtp(user, { enforceCooldown: true });
};
