import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as categoriesValidation from './categories.validation.js';
import * as categoriesController from './categories.controller.js';

const router = Router();

router.get('/', validate(categoriesValidation.list), categoriesController.list);
router.post('/', validate(categoriesValidation.create), categoriesController.create);
router.get('/:id', validate(categoriesValidation.getById), categoriesController.getById);
router.patch('/:id', validate(categoriesValidation.update), categoriesController.update);
router.delete('/:id', validate(categoriesValidation.remove), categoriesController.remove);

export default router;
