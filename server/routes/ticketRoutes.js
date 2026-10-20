import express from 'express';
import {
  getMyTickets,
  getTicketById,
  deleteTicket,
  deleteUsedTickets,
} from '../controllers/ticketController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// /mine and /used must come before /:id
router.get('/mine', protect, getMyTickets);
router.delete('/used', protect, deleteUsedTickets);
router.get('/:id', protect, getTicketById);
router.delete('/:id', protect, deleteTicket);

export default router;
