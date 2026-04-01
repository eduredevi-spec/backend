import { User } from "../../models/User.js";
import { RefreshToken } from "../../models/RefreshToken.js";
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

/**
 * Returns the safe public user object included in auth responses.
 */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  plan: user.plan,
  currency: user.currency,
});

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

// ─── Public service functions ────────────────────────────────────────────────

/**
 * Creates a new user account, generates a token pair, and persists the
 * refresh token. Returns the sanitised user object and both tokens.
 */
export const register = async ({ name, email, password }, deviceInfo = {}) => {
  console.log("ser");

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

  const familyId = generateFamilyId();
  const { accessToken, refreshToken } = generateTokenPair(user._id, familyId);
  await persistRefreshToken(user._id, refreshToken, familyId, deviceInfo);

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

/**
 * Validates credentials, enforces account lockout after 5 failed attempts,
 * and returns a token pair on success.
 * Always uses a generic error message to prevent email enumeration attacks.
 */

export const login = async ({ email, password }, deviceInfo = {}) => {
  const user = await User.findOne({ email, deletedAt: null }).select(
    "+password name email plan currency loginAttempts lockUntil lastLoginAt isActive",
  );

  // Generic message — never reveal whether the email exists
  if (!user) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Invalid email or password",
      ERROR_CODES.INVALID_CREDENTIALS,
    );
  }

  // Account lockout check
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

  // Successful login — reset lockout counters
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
 * Implements refresh token rotation with reuse detection.
 * - Verifies the incoming refresh token JWT.
 * - If no active tokens exist for the family, a reuse attack is assumed:
 *   revoke the entire family and throw.
 * - On success, revokes the old token and issues a new pair under a new familyId.
 */
export const refreshToken = async (rawToken, deviceInfo = {}) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(rawToken);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const { userId, familyId } = decoded;

  // Find all non-revoked tokens in this family
  const familyTokens = await RefreshToken.find({ familyId, isRevoked: false });

  // No active tokens in this family → token already rotated or explicitly revoked
  // This is a reuse detection scenario — lock down the entire family
  if (familyTokens.length === 0) {
    await revokeFamily(familyId);
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Refresh token reuse detected. All sessions have been revoked for your security.",
      ERROR_CODES.REFRESH_TOKEN_REUSE_DETECTED,
    );
  }

  // Find the specific token by comparing hashes
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

  // Revoke the consumed token
  matchedToken.isRevoked = true;
  await matchedToken.save();

  // Issue a new token pair under a fresh familyId
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
 * is revoked. Otherwise, all refresh tokens for the user are revoked (logs
 * out all devices).
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
      // Token is expired or malformed — nothing to revoke
    }
  } else {
    await RefreshToken.updateMany({ userId }, { isRevoked: true });
  }
};

/**
 * Generates a password reset token, hashes it with SHA-256, and saves it
 * to the user record. Always returns success to prevent email enumeration.
 * TODO: send the unhashed token via email.
 */
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email, deletedAt: null });

  if (!user) {
    // Return silently — never reveal whether an email is registered
    return;
  }

  const rawToken = generateRandomToken();
  user.passwordResetToken = sha256Hash(rawToken);
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);
  await user.save();

  // TODO: send email with link containing rawToken
  // await emailService.sendPasswordReset(user.email, rawToken);
};

/**
 * Validates the reset token, updates the password, and revokes all refresh
 * tokens (forcing re-login on all devices).
 */
export const resetPassword = async (rawToken, newPassword) => {
  const hashedToken = sha256Hash(rawToken);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    throw ApiError.badRequest("Reset token is invalid or has expired");
  }

  user.password = await hashPassword(newPassword);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });
};

/**
 * Changes the password for an authenticated user after verifying the current
 * password. Revokes all refresh tokens to force re-login everywhere.
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
