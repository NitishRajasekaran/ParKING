import express from 'express';
import { getMyTickets, getTicketById } from '../controllers/ticketController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// /mine must come before /:id
router.get('/mine', protect, getMyTickets);
router.get('/:id', protect, getTicketById);

export default router;
