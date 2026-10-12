import express from 'express';
import { getOwnerApplicationStatus } from '../controllers/authController.js';
import {
  getOwnerLots,
  createOwnerLot,
  getOwnerGuards,
  createOwnerGuard,
  assignGuardLots,
  getOwnerRevenue,
  getOwnerOccupancy,
} from '../controllers/ownerController.js';
import { protect, authorize, requireApprovedOwner } from '../middleware/auth.js';

const router = express.Router();

// Owner application status check for any authenticated owner (including pending/rejected)
router.get('/status', protect, authorize('owner'), getOwnerApplicationStatus);

// Approved Owner-only routes
router.get('/lots', protect, requireApprovedOwner, getOwnerLots);
router.post('/lots', protect, requireApprovedOwner, createOwnerLot);

router.get('/guards', protect, requireApprovedOwner, getOwnerGuards);
router.post('/guards', protect, requireApprovedOwner, createOwnerGuard);
router.patch('/guards/:id/assign', protect, requireApprovedOwner, assignGuardLots);

router.get('/metrics/revenue', protect, requireApprovedOwner, getOwnerRevenue);
router.get('/metrics/occupancy', protect, requireApprovedOwner, getOwnerOccupancy);

export default router;
