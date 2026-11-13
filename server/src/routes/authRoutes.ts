import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { login, me } from "../controllers/authController";
import { authenticate } from "../middleware/authenticate";
import { getNodeEnv } from "../utils/env";

const router = Router();

const isDev = getNodeEnv() !== "production";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 1000 : 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});

router.post("/login", loginLimiter, login);
router.get("/me", authenticate, me);

export default router;
