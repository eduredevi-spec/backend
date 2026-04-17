import { randomInt } from "crypto";
import config from "../../config/index.js";
import { User } from "../../models/User.js";
import { RefreshToken } from "../../models/RefreshToken.js";
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

  if (
    enforceCooldown &&
    user.emailVerificationOtpLastSentAt &&
    now - user.emailVerificationOtpLastSentAt.getTime() < EMAIL_OTP_RESEND_COOLDOWN_MS
  ) {
    throw new ApiError(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      `Please wait ${config.auth.emailOtpResendCooldownSeconds} seconds before requesting another OTP`,
      ERROR_CODES.EMAIL_OTP_RATE_LIMITED,
    );
  }

  const otp = generateNumericOtp(EMAIL_OTP_LENGTH);
  user.emailVerificationOtpHash = sha256Hash(otp);
  user.emailVerificationOtpExpires = new Date(now + EMAIL_OTP_EXPIRES_MS);
  user.emailVerificationOtpAttempts = 0;
  user.emailVerificationOtpLastSentAt = new Date(now);
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
 * Creates a new user account and sends a verification OTP to email.
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

  const hashed = await hashPassword(password);
  const user = await User.create({ name, email, password: hashed });
  await issueEmailVerificationOtp(user, { enforceCooldown: false });

  return {
    user: sanitizeUser(user),
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
 * Verifies email using OTP and marks user email as verified.
 */
export const verifyEmailOtp = async ({ email, otp }, deviceInfo = {}) => {
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
  const user = await User.findOne({ email, deletedAt: null }).select(
    "name email isEmailVerified +emailVerificationOtpLastSentAt +emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts",
  );

  if (!user || user.isEmailVerified) {
    return;
  }

  await issueEmailVerificationOtp(user, { enforceCooldown: true });
};

/**
 * Implements refresh token rotation with reuse detection.
 */
export const refreshToken = async (rawToken, deviceInfo = {}) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(rawToken);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const { userId, familyId } = decoded;

  const familyTokens = await RefreshToken.find({ familyId, isRevoked: false });

  if (familyTokens.length === 0) {
    await revokeFamily(familyId);
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Refresh token reuse detected. All sessions have been revoked for your security.",
      ERROR_CODES.REFRESH_TOKEN_REUSE_DETECTED,
    );
  }

  let matchedToken = null;
  for (const t of familyTokens) {
    const match = await comparePassword(rawToken, t.tokenHash);
    if (match) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  matchedToken.isRevoked = true;
  await matchedToken.save();

  const newFamilyId = generateFamilyId();
  const tokens = generateTokenPair(userId, newFamilyId);
  await persistRefreshToken(
    userId,
    tokens.refreshToken,
    newFamilyId,
    deviceInfo,
  );

  return tokens;
};

/**
 * Logs out a user. If a specific refresh token is provided, only that token
 * is revoked. Otherwise, all refresh tokens for the user are revoked.
 */
export const logout = async (userId, rawRefreshToken) => {
  if (rawRefreshToken) {
    try {
      const decoded = verifyRefreshToken(rawRefreshToken);
      const familyTokens = await RefreshToken.find({
        familyId: decoded.familyId,
        isRevoked: false,
      });
      for (const t of familyTokens) {
        const match = await comparePassword(rawRefreshToken, t.tokenHash);
        if (match) {
          t.isRevoked = true;
          await t.save();
          break;
        }
      }
    } catch {
      // Token is expired or malformed; nothing to revoke.
    }
  } else {
    await RefreshToken.updateMany({ userId }, { isRevoked: true });
  }
};

/**
 * Generates a password reset OTP, hashes it with SHA-256, and saves it.
 * Always returns success to prevent email enumeration.
 */
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email, deletedAt: null });

  if (!user) {
    return;
  }

  const otp = generateNumericOtp(EMAIL_OTP_LENGTH);
  user.passwordResetToken = sha256Hash(otp);
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);
  await user.save();

  await sendPasswordResetOtp({
    to: user.email,
    otp,
  });
};

/**
 * Validates the reset OTP, updates password, and revokes all refresh tokens.
 */
export const resetPassword = async (otp, newPassword) => {
  const hashedOtp = sha256Hash(otp);

  const user = await User.findOne({
    passwordResetToken: hashedOtp,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    throw ApiError.badRequest("Reset OTP is invalid or has expired");
  }

  user.password = await hashPassword(newPassword);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });
};

/**
 * Changes the password for an authenticated user after verifying current password.
 */
export const changePassword = async (
  userId,
  { currentPassword, newPassword },
) => {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) {
    throw ApiError.unauthorized("Current password is incorrect");
  }

  user.password = await hashPassword(newPassword);
  await user.save();

  await RefreshToken.updateMany({ userId }, { isRevoked: true });
};
