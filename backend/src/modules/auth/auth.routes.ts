import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "@/middleware/validate";
import { requireAuth } from "@/middleware/auth";
import { loginSchema, changePasswordSchema } from "./auth.schema";
import { login, me, logout, changePassword } from "./auth.controller";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later." },
});

router.post("/login", loginLimiter, validate({ body: loginSchema }), login);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);
router.post("/change-password", requireAuth, validate({ body: changePasswordSchema }), changePassword);

export default router;
