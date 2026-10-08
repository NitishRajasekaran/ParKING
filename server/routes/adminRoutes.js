import express from 'express';
import {
  getRevenue,
  getOccupancy,
  getAdminLots,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/metrics/revenue', protect, authorize('admin'), getRevenue);
router.get('/metrics/occupancy', protect, authorize('admin'), getOccupancy);
router.get('/lots', protect, authorize('admin'), getAdminLots);

export default router;