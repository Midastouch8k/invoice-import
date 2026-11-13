import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/authenticate";
import { WRITE_ROLES, requireRole } from "../middleware/authorize";
import {
  approveStaging,
  getImportBatches,
  getStagingInvoices,
  rejectStaging,
  uploadInvoices,
} from "../controllers/uploadController";

const router = Router();

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      cb(new Error("Only .csv files are accepted"));
      return;
    }
    cb(null, true);
  },
});

router.use(authenticate);

router.post("/", requireRole(...WRITE_ROLES), upload.single("file"), uploadInvoices);
router.get("/staging", requireRole(), getStagingInvoices);
router.post("/staging/reject", requireRole(...WRITE_ROLES), rejectStaging);
router.post("/approve", requireRole(...WRITE_ROLES), approveStaging);
router.get("/batches", requireRole(), getImportBatches);

export default router;
