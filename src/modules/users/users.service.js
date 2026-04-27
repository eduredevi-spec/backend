import { User } from "../../models/User.js";
import { ApiError } from "../../shared/ApiError.js";
import { HTTP_STATUS } from "../../constants/httpStatus.js";

/**
 * Update user profile by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
export const updateProfile = async (userId, updateBody) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
  }
  
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Get user profile by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
export const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
  }
  return user;
};
