import Joi from 'joi';

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': 'Invalid ID format' });

export const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(50).required(),
    type: Joi.string().valid('bank', 'cash', 'wallet', 'credit_card', 'investment', 'loan').required(),
    balance: Joi.number().default(0),
    currency: Joi.string().max(3).default('INR'),
    color: Joi.string().default('#2D5BFF'),
    icon: Joi.string().default('wallet'),
    includeInTotal: Joi.boolean().default(true),
    note: Joi.string().max(200).optional().allow(''),
  }),
};

export const update = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(50).optional(),
    type: Joi.string().valid('bank', 'cash', 'wallet', 'credit_card', 'investment', 'loan').optional(),
    balance: Joi.number().optional(),
    currency: Joi.string().max(3).optional(),
    color: Joi.string().optional(),
    icon: Joi.string().optional(),
    includeInTotal: Joi.boolean().optional(),
    isArchived: Joi.boolean().optional(),
    sortOrder: Joi.number().optional(),
    note: Joi.string().max(200).optional().allow(''),
  }).min(1),
};

export const getById = {
  params: Joi.object({ id: objectId.required() }),
};

export const remove = {
  params: Joi.object({ id: objectId.required() }),
};

export const list = {
  query: Joi.object({
    type: Joi.string().valid('bank', 'cash', 'wallet', 'credit_card', 'investment', 'loan'),
    includeArchived: Joi.boolean().default(false),
    limit: Joi.number().integer().min(1).max(100).default(50),
    sortBy: Joi.string().default('sortOrder'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};