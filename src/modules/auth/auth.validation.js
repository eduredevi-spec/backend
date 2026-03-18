import Joi from "joi";

/**
 * Reusable password field: min 8, max 128, must contain at least one uppercase
 * letter, one lowercase letter, and one number.
 */
const passwordField = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  .messages({
    "string.pattern.base":
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  });

export const register = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().lowercase().trim().required(),
    password: passwordField.required(),
  }),
};

export const login = {
  body: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required(),
  }),
};

export const refreshToken = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

export const forgotPassword = {
  body: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
  }),
};

export const resetPassword = {
  body: Joi.object({
    token: Joi.string().required(),
    password: passwordField.required(),
  }),
};

export const changePassword = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordField.required(),
  })
    .custom((value, helpers) => {
      if (value.currentPassword === value.newPassword) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .messages({
      "any.invalid": "New password must be different from current password",
    }),
};

export const verifyEmail = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};
