import Joi from 'joi';

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': 'Invalid ID format' });

export const create = {
  body: Joi.object({
    type: Joi.string().valid('income', 'expense', 'transfer').required(),
    amount: Joi.number().positive().required(),
    accountId: objectId.required(),
    toAccountId: Joi.when('type', {
      is: 'transfer',
      then: objectId.required().messages({ 'any.required': 'toAccountId is required for transfers' }),
      otherwise: objectId.optional().allow(null, ''),
    }),
    categoryId: objectId.optional().allow(null, ''),
    date: Joi.date().iso().optional(),
    payee: Joi.string().trim().max(100).optional().allow(''),
    note: Joi.string().max(500).optional().allow(''),
    tags: Joi.array().items(Joi.string().trim()).max(10).optional(),
    receiptUrl: Joi.string().uri().optional().allow(null, ''),
    location: Joi.string().max(100).optional().allow(''),
    idempotencyKey: Joi.string().optional(),
  }),
};

export const update = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    type: Joi.string().valid('income', 'expense', 'transfer').optional(),
    amount: Joi.number().positive().optional(),
    accountId: objectId.optional(),
    toAccountId: objectId.optional().allow(null, ''),
    categoryId: objectId.optional().allow(null, ''),
    date: Joi.date().iso().optional(),
    payee: Joi.string().trim().max(100).optional().allow(''),
    note: Joi.string().max(500).optional().allow(''),
    tags: Joi.array().items(Joi.string().trim()).max(10).optional(),
    receiptUrl: Joi.string().uri().optional().allow(null, ''),
    location: Joi.string().max(100).optional().allow(''),
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
    cursor: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().valid('income', 'expense', 'transfer').optional(),
    accountId: objectId.optional(),
    categoryId: objectId.optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    tags: Joi.alternatives()
      .try(Joi.array().items(Joi.string()), Joi.string())
      .optional(),
    search: Joi.string().trim().max(100).optional(),
  }),
};
