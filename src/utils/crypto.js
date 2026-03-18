import crypto from 'crypto';

/**
 * Generates a cryptographically random hex string.
 * Default length is 32 bytes → 64-character hex string.
 * Used for: email verification tokens, password reset tokens, invite codes.
 */
export const generateRandomToken = (length = 32) =>
  crypto.randomBytes(length).toString('hex');

/**
 * Generates a UUID v4 using the built-in crypto module.
 * Used for: refresh token familyId to group tokens from the same login session.
 */
export const generateFamilyId = () => crypto.randomUUID();

/**
 * Returns a SHA-256 hex digest of the input string.
 * Used for: storing password reset tokens in the database (fast lookup,
 * not bcrypt — bcrypt can't be used for DB queries since it's one-way with a random salt).
 */
export const sha256Hash = (data) =>
  crypto.createHash('sha256').update(data).digest('hex');
