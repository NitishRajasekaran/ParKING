import express from 'express';
import { updateSlotState } from '../controllers/simulatorController.js';

const router = express.Router();

// Authenticated via x-simulator-key header, not JWT
router.post('/slot-state', updateSlotState);

export default router;
