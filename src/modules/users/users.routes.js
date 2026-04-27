import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import * as usersValidation from "./users.validation.js";
import * as usersController from "./users.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", usersController.getMe);
router.patch(
  "/update-profile",
  validate(usersValidation.updateProfile),
  usersController.updateProfile,
);

export default router;
