import express from 'express';
import { getOwnerApplicationStatus } from '../controllers/authController.js';
import {
  getOwnerLots,
  createOwnerLot,
  getOwnerGuards,
  createOwnerGuard,
  assignGuardLots,
  deleteOwnerGuard,
  getOwnerRevenue,
  getOwnerOccupancy,
} from '../controllers/ownerController.js';
import { protect, authorize, requireApprovedOwner } from '../middleware/auth.js';

const router = express.Router();

// Owner application status check for any authenticated owner (including pending/rejected) or admin
router.get('/status', protect, authorize('owner', 'platform_admin', 'admin'), getOwnerApplicationStatus);

// Approved Owner-only routes
router.get('/lots', protect, requireApprovedOwner, getOwnerLots);
router.post('/lots', protect, requireApprovedOwner, createOwnerLot);

router.get('/guards', protect, requireApprovedOwner, getOwnerGuards);
router.post('/guards', protect, requireApprovedOwner, createOwnerGuard);
router.patch('/guards/:id/assign', protect, requireApprovedOwner, assignGuardLots);
router.delete('/guards/:id', protect, requireApprovedOwner, deleteOwnerGuard);

router.get('/metrics/revenue', protect, requireApprovedOwner, getOwnerRevenue);
router.get('/metrics/occupancy', protect, requireApprovedOwner, getOwnerOccupancy);

export default router;
