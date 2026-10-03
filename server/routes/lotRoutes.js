import express from 'express';
import {
  createLot,
  getNearbyLots,
  getLotById,
  getLotSlots,
  getAllLots,
} from '../controllers/lotController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// /api/lots/nearby must come before /:id to avoid Express matching 'nearby' as an ID
router.get('/nearby', protect, getNearbyLots);
router.get('/', protect, authorize('admin'), getAllLots);
router.get('/:id', protect, getLotById);
router.get('/:id/slots', protect, getLotSlots);
router.post('/', protect, authorize('admin'), createLot);

export default router;
