import express from 'express';
import { createReservation, getMyReservations } from '../controllers/reservationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, authorize('driver'), createReservation);
router.get('/mine', protect, authorize('driver'), getMyReservations);

export default router;
