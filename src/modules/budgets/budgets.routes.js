import { Router } from 'express';
import * as budgetsController from './budgets.controller.js';

const router = Router();

router.get('/',  budgetsController.list);
router.post('/', budgetsController.create);
router.delete('/:id', budgetsController.remove);

export default router;
