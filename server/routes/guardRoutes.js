import express from 'express';
import { validateTicket, confirmEntry, confirmExit } from '../controllers/guardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/validate', protect, authorize('guard'), validateTicket);
router.post('/entry', protect, authorize('guard'), confirmEntry);
router.post('/exit', protect, authorize('guard'), confirmExit);

export default router;
