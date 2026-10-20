import express from 'express';
import {
  getMyTickets,
  getTicketById,
  deleteTicket,
  deleteUsedTickets,
} from '../controllers/ticketController.js';
import {
  submitSlotCancellationRequest,
  getTicketCancellationRequest,
} from '../controllers/adminRequestController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// /mine and /used must come before /:id
router.get('/mine', protect, getMyTickets);
router.delete('/used', protect, deleteUsedTickets);
router.get('/:id', protect, getTicketById);
router.delete('/:id', protect, deleteTicket);
router.post('/:id/cancel-request', protect, submitSlotCancellationRequest);
router.get('/:id/cancel-request', protect, getTicketCancellationRequest);

export default router;
