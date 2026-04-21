import Joi from 'joi';

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

export const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(50).required(),
    amount: Joi.number().required(),
    dueDate: Joi.date().required(),
    categoryId: Joi.string().optional().allow(''),
    note: Joi.string().max(200).optional().allow(''),
    idempotencyKey: Joi.string().optional(),
  }),
};

export const update = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(50).optional(),
    amount: Joi.number().optional(),
    dueDate: Joi.date().optional(),
    categoryId: Joi.string().optional().allow(''),
    isPaid: Joi.boolean().optional(),
    note: Joi.string().max(200).optional().allow(''),
  }).min(1),
};

export const markAsPaid = {
  params: Joi.object({ id: objectId.required() }),
};

export const remove = {
  params: Joi.object({ id: objectId.required() }),
};
