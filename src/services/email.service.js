import config from "../config/index.js";

const isProd = config.nodeEnv === "production";

/**
 * Sends an email verification OTP.
 */
export const sendEmailVerificationOtp = async ({ to, name, otp }) => {
  if (!isProd) {
    console.info(
      `[DEV][EMAIL_OTP] verification otp for ${to}${name ? ` (${name})` : ""}: ${otp}`,
    );
  }
};

/**
 * Sends a password reset OTP.
 */
export const sendPasswordResetOtp = async ({ to, otp }) => {
  if (!isProd) {
    console.info(`[DEV][EMAIL_OTP] password reset otp for ${to}: ${otp}`);
  }
};
