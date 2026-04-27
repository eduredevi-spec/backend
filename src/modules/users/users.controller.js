import { catchAsync } from "../../shared/catchAsync.js";
import * as ApiResponse from "../../shared/ApiResponse.js";
import * as userService from "./users.service.js";

/**
 * GET /me
 * Returns the currently authenticated user's profile.
 */
export const getMe = catchAsync(async (req, res) => {
  const user = await userService.getProfile(req.user._id);
  return ApiResponse.success(res, {
    data: user,
    message: "User profile retrieved",
  });
});

/**
 * PATCH /update-profile
 * Updates the currently authenticated user's profile.
 */
export const updateProfile = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  return ApiResponse.success(res, {
    data: user,
    message: "Profile updated successfully",
  });
});
