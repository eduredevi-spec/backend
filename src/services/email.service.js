import nodemailer from "nodemailer";
import config from "../config/index.js";
import { logger } from "../utils/logger.js";

const isProd = config.nodeEnv === "production";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// Verify SMTP connection on startup
transporter.verify((error) => {
  if (error) {
    logger.error("SMTP connection error:", error);
  } else {
    logger.info("SMTP server is ready to take our messages");
  }
});

/**
 * Sends an email verification OTP.
 */
export const sendEmailVerificationOtp = async ({ to, name, otp }) => {
  const mailOptions = {
    from: config.email.from,
    to,
    subject: "Email Verification OTP",
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2D3748;">Hello ${name || "User"},</h2>
        <p style="font-size: 16px;">Thank you for registering. Your verification code is:</p>
        <div style="background-color: #F7FAFC; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <h1 style="color: #4A90E2; font-size: 36px; letter-spacing: 10px; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #718096;">This code will expire in ${config.auth.emailOtpExpiresMinutes} minutes.</p>
        <p style="font-size: 14px; color: #718096;">If you did not request this code, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #A0AEC0; text-align: center;">&copy; ${new Date().getFullYear()} Money Manager. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent: ${info.messageId}`);
  } catch (error) {
    logger.error("Error sending verification email:", error);
    // In development, still log the OTP so the user can proceed even if SMTP fails
    if (!isProd) {
      console.info(`[DEV][FALLBACK] OTP for ${to}: ${otp}`);
    }
    throw error;
  }
};

/**
 * Sends a password reset OTP.
 */
export const sendPasswordResetOtp = async ({ to, otp }) => {
  const mailOptions = {
    from: config.email.from,
    to,
    subject: "Password Reset OTP",
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2D3748;">Password Reset Request</h2>
        <p style="font-size: 16px;">We received a request to reset your password. Your reset code is:</p>
        <div style="background-color: #FFF5F5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <h1 style="color: #E53E3E; font-size: 36px; letter-spacing: 10px; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #718096;">This code will expire in 1 hour.</p>
        <p style="font-size: 14px; color: #718096;">If you did not request a password reset, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #A0AEC0; text-align: center;">&copy; ${new Date().getFullYear()} Money Manager. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent: ${info.messageId}`);
  } catch (error) {
    logger.error("Error sending password reset email:", error);
    if (!isProd) {
      console.info(`[DEV][FALLBACK] Password Reset OTP for ${to}: ${otp}`);
    }
    throw error;
  }
};
