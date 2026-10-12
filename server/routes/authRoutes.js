import express from 'express';
import {
  register,
  login,
  getMe,
  getAdminSetupStatus,
  setupFirstAdmin,
  applyOwner,
  getOwnerApplicationStatus,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/setup-admin/status', getAdminSetupStatus);
router.post('/setup-admin', setupFirstAdmin);
router.post('/apply-owner', applyOwner);
router.post('/owner/apply', applyOwner);
router.get('/owner/status', protect, authorize('owner'), getOwnerApplicationStatus);
router.get('/me', protect, getMe);

export default router;
