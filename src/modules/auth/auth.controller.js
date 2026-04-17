import { catchAsync } from "../../shared/catchAsync.js";
import * as ApiResponse from "../../shared/ApiResponse.js";
import * as authService from "./auth.service.js";

/** Extracts device info from the request for refresh token storage. */
const deviceInfo = (req) => ({
  userAgent: req.headers["user-agent"],
  ip: req.ip,
});

/**
 * POST /register
 * Creates a new user and returns the user object with a token pair.
 */
export const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  return ApiResponse.created(res, {
    data: result,
    message: "Account created. Verification OTP sent to email",
  });
});

/**
 * POST /login
 * Authenticates credentials and returns the user object with a token pair.
 */
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password }, deviceInfo(req));
  return ApiResponse.success(res, {
    data: result,
    message: "Login successful",
  });
});

/**
 * POST /verify-email-otp
 * Verifies user's email using OTP code sent over email.
 */
export const verifyEmailOtp = catchAsync(async (req, res) => {
  const result = await authService.verifyEmailOtp(req.body, deviceInfo(req));
  return ApiResponse.success(res, {
    data: result,
    message: "Email verified successfully",
  });
});

/**
 * POST /resend-email-otp
 * Sends a fresh verification OTP email.
 */
export const resendEmailOtp = catchAsync(async (req, res) => {
  await authService.resendEmailVerificationOtp(req.body);
  return ApiResponse.success(res, {
    data: null,
    message: "If the email is registered, a verification OTP has been sent",
  });
});

/**
 * POST /refresh-token
 * Rotates a refresh token and returns a new token pair.
 */
export const refreshToken = catchAsync(async (req, res) => {
  const tokens = await authService.refreshToken(
    req.body.refreshToken,
    deviceInfo(req),
  );
  return ApiResponse.success(res, {
    data: tokens,
    message: "Tokens refreshed",
  });
});

/**
 * POST /logout  (protected)
 * Revokes the provided refresh token (or all tokens if none given).
 */
export const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user._id, req.body?.refreshToken);
  return ApiResponse.success(res, {
    data: null,
    message: "Logged out successfully",
  });
});

/**
 * POST /forgot-password
 * Sends a password reset email if the address is registered.
 * Always responds with the same message to prevent email enumeration.
 */
export const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  return ApiResponse.success(res, {
    data: null,
    message: "If that email is registered, a reset link has been sent",
  });
});

/**
 * POST /reset-password
 * Validates the reset token and updates the password.
 */
export const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  return ApiResponse.success(res, {
    data: null,
    message: "Password reset successfully",
  });
});

/**
 * POST /change-password  (protected)
 * Updates the password for the currently authenticated user.
 */
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, {
    currentPassword,
    newPassword,
  });
  return ApiResponse.success(res, {
    data: null,
    message: "Password changed successfully",
  });
});
