import Joi from "joi";

export const updateProfile = {
  body: Joi.object().keys({
    name: Joi.string().min(2).max(50),
    currency: Joi.string().length(3).uppercase(),
    language: Joi.string().min(2).max(10),
    timezone: Joi.string(),
  }),
};
