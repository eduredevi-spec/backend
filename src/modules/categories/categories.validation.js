import Joi from 'joi';

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': 'Invalid ID format' });

export const create = {
  body: Joi.object({
    name: Joi.string().trim().max(50).required(),
    type: Joi.string().valid('income', 'expense').required(),
    icon: Joi.string().trim().optional(),
    color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional(),
    parentId: objectId.optional().allow(null),
    keywords: Joi.array().items(Joi.string().trim()).optional(),
    sortOrder: Joi.number().integer().optional(),
  }),
};

export const update = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: Joi.string().trim().max(50).optional(),
    type: Joi.string().valid('income', 'expense').optional(),
    icon: Joi.string().trim().optional(),
    color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional(),
    parentId: objectId.optional().allow(null),
    keywords: Joi.array().items(Joi.string().trim()).optional(),
    sortOrder: Joi.number().integer().optional(),
    isHidden: Joi.boolean().optional(),
  }).min(1),
};

export const getById = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

export const remove = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

export const list = {
  query: Joi.object({
    type: Joi.string().valid('income', 'expense').optional(),
    parentId: objectId.optional().allow(null),
    includeSystem: Joi.boolean().default(true),
  }),
};
