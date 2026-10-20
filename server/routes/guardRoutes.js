import express from 'express';
import { validateTicket, confirmEntry, confirmExit } from '../controllers/guardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/validate', protect, authorize('guard', 'platform_admin', 'admin', 'owner'), validateTicket);
router.post('/entry', protect, authorize('guard', 'platform_admin', 'admin', 'owner'), confirmEntry);
router.post('/exit', protect, authorize('guard', 'platform_admin', 'admin', 'owner'), confirmExit);

export default router;
