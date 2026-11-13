import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { login, me } from "../controllers/authController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});

router.post("/login", loginLimiter, login);
router.get("/me", authenticate, me);

export default router;
