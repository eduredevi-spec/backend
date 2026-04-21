import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as billsController from './bills.controller.js';
import * as billsValidation from './bills.validation.js';

const router = express.Router();

router.use(authenticate);

router
  .route('/')
  .post(validate(billsValidation.create), billsController.create)
  .get(billsController.list);

router
  .route('/:id')
  .patch(validate(billsValidation.update), billsController.update)
  .delete(validate(billsValidation.remove), billsController.remove);

router.post('/:id/pay', validate(billsValidation.markAsPaid), billsController.markAsPaid);

export default router;
