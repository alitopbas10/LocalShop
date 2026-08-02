import { Router } from "express";

import * as authController from "@/modules/auth/auth.controller";
import { loginSchema, registerSchema } from "@/modules/auth/auth.schemas";
import { authRateLimit } from "@/middlewares/authRateLimit";
import { authenticate } from "@/middlewares/authenticate";
import { validate } from "@/middlewares/validate";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  authRateLimit,
  validate({ body: registerSchema }),
  authController.register,
);

authRoutes.post("/login", authRateLimit, validate({ body: loginSchema }), authController.login);

authRoutes.get("/me", authenticate, authController.getCurrentUser);
