import { Router } from 'express';
import multer from 'multer';
import { uploadInvoices, approveStaging, getStagingInvoices } from '../controllers/uploadController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), uploadInvoices);
router.post('/approve', approveStaging);
router.get('/staging', getStagingInvoices);

export default router;