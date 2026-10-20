import express from 'express';
import {
  createLot,
  getNearbyLots,
  getLotById,
  getLotSlots,
  getAllLots,
  deleteSlot,
} from '../controllers/lotController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// /api/lots/nearby must come before /:id to avoid Express matching 'nearby' as an ID
router.get('/nearby', protect, getNearbyLots);
router.get('/', protect, authorize('admin'), getAllLots);
router.get('/:id', protect, getLotById);
router.get('/:id/slots', protect, getLotSlots);
router.delete('/:lotId/slots/:slotId', protect, authorize('admin', 'platform_admin', 'owner'), deleteSlot);
router.post('/', protect, authorize('admin', 'platform_admin', 'owner'), createLot);

export default router;
