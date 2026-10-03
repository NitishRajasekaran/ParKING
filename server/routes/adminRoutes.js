import express from 'express';
import { getRevenue, getOccupancy } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/revenue', protect, authorize('admin'), getRevenue);
router.get('/occupancy', protect, authorize('admin'), getOccupancy);

export default router;
