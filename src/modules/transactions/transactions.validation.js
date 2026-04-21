import Joi from 'joi';
import { TRANSACTION_CATEGORY_KEYS } from '../../constants/categories.js';

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': 'Invalid ID format' });

const categoryMatchesType = (value, helpers) => {
  if (value.type === 'transfer' && value.categoryId) {
    return helpers.message('categoryId is not allowed for transfer transactions');
  }
  return value;
};

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
    categoryId: Joi.string().optional().allow(null, ''),
    date: Joi.date().iso().optional(),
    payee: Joi.string().trim().max(100).optional().allow(''),
    note: Joi.string().max(500).optional().allow(''),
    tags: Joi.array().items(Joi.string().trim()).max(10).optional(),
    receiptUrl: Joi.string().uri().optional().allow(null, ''),
    location: Joi.string().max(100).optional().allow(''),
    idempotencyKey: Joi.string().optional(),
  }).custom(categoryMatchesType),
};

export const update = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    type: Joi.string().valid('income', 'expense', 'transfer').optional(),
    amount: Joi.number().positive().optional(),
    accountId: objectId.optional(),
    toAccountId: objectId.optional().allow(null, ''),
    categoryId: Joi.string().optional().allow(null, ''),
    date: Joi.date().iso().optional(),
    payee: Joi.string().trim().max(100).optional().allow(''),
    note: Joi.string().max(500).optional().allow(''),
    tags: Joi.array().items(Joi.string().trim()).max(10).optional(),
    receiptUrl: Joi.string().uri().optional().allow(null, ''),
    location: Joi.string().max(100).optional().allow(''),
  }).min(1).custom(categoryMatchesType),
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
    categoryId: Joi.string().optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    tags: Joi.alternatives()
      .try(Joi.array().items(Joi.string()), Joi.string())
      .optional(),
    search: Joi.string().trim().max(100).optional(),
  }),
};
