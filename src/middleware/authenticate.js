import { verifyAccessToken } from "../utils/token.js";
import { User } from "../models/User.js";
import { ApiError } from "../shared/ApiError.js";
import { ERROR_CODES } from "../constants/index.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { catchAsync } from "../shared/catchAsync.js";

/**
 * Verifies the Bearer token in the Authorization header, loads the user
 * from the database, and attaches them to req.user.
 * Throws 401 for missing, expired, or invalid tokens and for disabled accounts.
 */
export const authenticate = catchAsync(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Access token is required");
  }

  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized(
        "Access token has expired",
        ERROR_CODES.TOKEN_EXPIRED,
      );
    }
    throw ApiError.unauthorized(
      "Invalid access token",
      ERROR_CODES.TOKEN_INVALID,
    );
  }

  const user = await User.findById(decoded.userId).select(
    "_id name email plan isActive isEmailVerified",
  );

  if (!user || !user.isActive) {
    throw ApiError.unauthorized("User not found or account disabled");
  }
  if (!user.isEmailVerified) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      "Email not verified. Please verify your email with OTP",
      ERROR_CODES.ACCOUNT_NOT_VERIFIED,
    );
  }

  req.user = user;
  next();
});
