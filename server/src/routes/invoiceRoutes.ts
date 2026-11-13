import { Router } from "express";
import { listInvoices } from "../controllers/invoiceController";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";

const router = Router();

router.use(authenticate);
router.get("/", requireRole(), listInvoices);

export default router;
