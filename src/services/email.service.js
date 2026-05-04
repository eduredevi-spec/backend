import nodemailer from "nodemailer";
import config from "../config/index.js";
import { logger } from "../utils/logger.js";

const isProd = config.nodeEnv === "production";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

transporter.verify((error) => {
  if (error) {
    logger.error("SMTP connection error:", error);
  } else {
    logger.info("SMTP server is ready to take our messages");
  }
});

// Brand configuration
const brand = {
  name: "Money Manager",
  logo: "https://raw.githubusercontent.com/modsuhail25/Money_Manager/main/mobile/web/icons/Icon-192.png",
  color: "#4A90E2",
  supportEmail: "support@moneymanager.com",
};

const getBaseTemplate = (content) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brand.name}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { background-color: ${brand.color}; padding: 30px; text-align: center; }
      .header img { width: 80px; height: 80px; border-radius: 20px; background-color: #fff; padding: 5px; }
      .header h1 { color: #ffffff; margin: 10px 0 0 0; font-size: 24px; }
      .content { padding: 40px; color: #333333; line-height: 1.6; }
      .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
      .otp-container { background-color: #f1f5f9; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; border: 2px dashed ${brand.color}; }
      .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 12px; color: ${brand.color}; margin: 0; }
      .btn { display: inline-block; padding: 12px 24px; background-color: ${brand.color}; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; }
      .social-links { margin-top: 15px; }
      .social-links a { color: ${brand.color}; text-decoration: none; margin: 0 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="${brand.logo}" alt="${brand.name} Logo">
        <h1>${brand.name}</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
        <p>If you have any questions, contact us at <a href="mailto:${brand.supportEmail}" style="color: ${brand.color}">${brand.supportEmail}</a></p>
      </div>
    </div>
  </body>
  </html>
`;

/**
 * Sends an email verification OTP.
 */
export const sendEmailVerificationOtp = async ({ to, name, otp }) => {
  const content = `
    <h2 style="color: #1e293b; margin-top: 0;">Verify Your Email</h2>
    <p>Hi ${name || "there"},</p>
    <p>Welcome to <strong>${brand.name}</strong>! We're excited to have you on board. To complete your registration and secure your account, please use the verification code below:</p>
    <div class="otp-container">
      <p style="margin-bottom: 10px; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
      <h1 class="otp-code">${otp}</h1>
    </div>
    <p>This code is valid for <strong>${config.auth.emailOtpExpiresMinutes} minutes</strong>. For your security, please do not share this code with anyone.</p>
    <p>If you didn't create an account with us, you can safely ignore this email.</p>
  `;

  const mailOptions = {
    from: `"${brand.name}" <${config.email.from}>`,
    to,
    subject: `Verify your ${brand.name} account`,
    html: getBaseTemplate(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent: ${info.messageId}`);
  } catch (error) {
    logger.error("Error sending verification email:", error);
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
  const content = `
    <h2 style="color: #1e293b; margin-top: 0;">Reset Your Password</h2>
    <p>Hello,</p>
    <p>We received a request to reset the password for your <strong>${brand.name}</strong> account. Use the code below to proceed with the reset:</p>
    <div class="otp-container" style="border-color: #ef4444;">
      <p style="margin-bottom: 10px; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reset Code</p>
      <h1 class="otp-code" style="color: #ef4444;">${otp}</h1>
    </div>
    <p>This code will expire in <strong>1 hour</strong>. If you didn't request this, please ignore this email or contact support if you have concerns.</p>
    <p>Stay secure,<br>The ${brand.name} Team</p>
  `;

  const mailOptions = {
    from: `"${brand.name}" <${config.email.from}>`,
    to,
    subject: `Password Reset for ${brand.name}`,
    html: getBaseTemplate(content),
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
