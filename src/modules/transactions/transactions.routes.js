import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as transactionsValidation from './transactions.validation.js';
import * as transactionsController from './transactions.controller.js';

const router = Router();

// All routes are already protected by authenticate in loaders/routes.js

router.get('/',    validate(transactionsValidation.list),    transactionsController.list);
router.post('/',   validate(transactionsValidation.create),  transactionsController.create);
router.get('/:id', validate(transactionsValidation.getById), transactionsController.getById);
router.patch('/:id', validate(transactionsValidation.update), transactionsController.update);
router.delete('/:id', validate(transactionsValidation.remove), transactionsController.remove);

export default router;
