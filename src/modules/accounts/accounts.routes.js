import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as accountsValidation from './accounts.validation.js';
import * as accountsController from './accounts.controller.js';

const router = Router();

// All routes are already protected by authenticate in loaders/routes.js

router.get('/',    validate(accountsValidation.list),    accountsController.list);
router.post('/',   validate(accountsValidation.create),  accountsController.create);
router.get('/:id', validate(accountsValidation.getById), accountsController.getById);
router.patch('/:id', validate(accountsValidation.update), accountsController.update);
router.delete('/:id', validate(accountsValidation.remove), accountsController.remove);

export default router;