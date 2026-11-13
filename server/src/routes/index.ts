import { Router } from "express";
import authRouter from "./authRoutes";
import healthRouter from "./health";
import invoiceRouter from "./invoiceRoutes";
import uploadRouter from "./uploadRoutes";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/upload", uploadRouter);
router.use("/invoices", invoiceRouter);

export default router;
