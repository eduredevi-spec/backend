import bcrypt from 'bcryptjs';
import config from '../config/index.js';

/**
 * Hashes a plain-text password using bcrypt.
 * Cost factor is taken from config.bcrypt.saltRounds (default 12).
 */
export const hashPassword = (password) => bcrypt.hash(password, config.bcrypt.saltRounds);

/**
 * Compares a plain-text password against a bcrypt hash.
 * Returns true if they match, false otherwise.
 */
export const comparePassword = (password, hash) => bcrypt.compare(password, hash);
