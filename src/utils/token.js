import jwt from "jsonwebtoken";
import config from "../config/index.js";

/**
 * Signs a short-lived access token containing the userId.
 * Expires in 15 minutes.
 */
export const generateAccessToken = (userId) =>
  jwt.sign({ userId: String(userId) }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });

/**
 * Signs a long-lived refresh token containing the userId and familyId.
 * The familyId ties all tokens in one login session together for reuse detection.
 * Expires in 30 days.
 */
export const generateRefreshToken = (userId, familyId) =>
  jwt.sign({ userId: String(userId), familyId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

/**
 * Verifies an access token and returns the decoded payload.
 * Throws jwt.TokenExpiredError or jwt.JsonWebTokenError on failure.
 */
export const verifyAccessToken = (token) =>
  jwt.verify(token, config.jwt.accessSecret);

/**
 * Verifies a refresh token and returns the decoded payload.
 * Throws jwt.TokenExpiredError or jwt.JsonWebTokenError on failure.
 */
export const verifyRefreshToken = (token) =>
  jwt.verify(token, config.jwt.refreshSecret);

/**
 * Convenience helper that generates both tokens in one call.
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export const generateTokenPair = (userId, familyId) => ({
  accessToken: generateAccessToken(userId),
  refreshToken: generateRefreshToken(userId, familyId),
});
