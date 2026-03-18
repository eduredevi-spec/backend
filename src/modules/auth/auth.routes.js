import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as authValidation from './auth.validation.js';
import * as authController from './auth.controller.js';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────

router.post('/register', validate(authValidation.register), authController.register);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/refresh-token', validate(authValidation.refreshToken), authController.refreshToken);
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);

// ─── Protected routes ─────────────────────────────────────────────────────────

router.post('/logout', authenticate, authController.logout);
router.post(
  '/change-password',
  authenticate,
  validate(authValidation.changePassword),
  authController.changePassword
);

export default router;
