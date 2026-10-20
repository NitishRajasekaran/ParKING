import express from 'express';
import {
  getRevenue,
  getOccupancy,
  getAdminLots,
  getStaffUsers,
  createStaffUser,
  assignGuardLots,
  deleteStaffUser,
  deleteLot,
  getPendingOwnerApplications,
  getOwnerApplications,
  approveOwnerApplication,
  rejectOwnerApplication,
  assignLotOwner,
} from '../controllers/adminController.js';
import {
  getAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
} from '../controllers/adminRequestController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/metrics/revenue', protect, authorize('admin'), getRevenue);
router.get('/metrics/occupancy', protect, authorize('admin'), getOccupancy);
router.get('/lots', protect, authorize('admin'), getAdminLots);
router.delete('/lots/:id', protect, authorize('platform_admin'), deleteLot);

router.get('/users', protect, authorize('platform_admin'), getStaffUsers);
router.post('/users', protect, authorize('platform_admin'), createStaffUser);
router.patch('/users/:id/assign-lots', protect, authorize('platform_admin'), assignGuardLots);
router.delete('/users/:id', protect, authorize('platform_admin'), deleteStaffUser);

// Owner Application Management (Platform Admin)
router.get('/owners/pending', protect, authorize('platform_admin'), getPendingOwnerApplications);
router.get('/owners', protect, authorize('platform_admin'), getOwnerApplications);
router.post('/owners/:id/approve', protect, authorize('platform_admin'), approveOwnerApplication);
router.patch('/owners/:id/approve', protect, authorize('platform_admin'), approveOwnerApplication);
router.post('/owners/:id/reject', protect, authorize('platform_admin'), rejectOwnerApplication);
router.patch('/owners/:id/reject', protect, authorize('platform_admin'), rejectOwnerApplication);

// Lot Assignment (Platform Admin)
router.patch('/lots/:id/assign-owner', protect, authorize('platform_admin'), assignLotOwner);
router.post('/lots/:id/assign-owner', protect, authorize('platform_admin'), assignLotOwner);

// Verification Requests (Password Reset & Slot Cancellation)
router.get('/requests', protect, authorize('admin'), getAdminRequests);
router.post('/requests/:id/approve', protect, authorize('platform_admin'), approveAdminRequest);
router.post('/requests/:id/reject', protect, authorize('platform_admin'), rejectAdminRequest);

export default router;
