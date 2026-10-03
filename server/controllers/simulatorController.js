import Slot from '../models/Slot.js';
import { createOccupancySnapshot } from '../services/occupancyService.js';
import { getIo } from '../config/io.js';

// Called by the hardware simulator via POST /api/simulator/slot-state
// Protected by a pre-shared SIMULATOR_KEY header (not JWT)
export const updateSlotState = async (req, res) => {
  try {
    const key = req.headers['x-simulator-key'];
    if (!key || key !== process.env.SIMULATOR_KEY) {
      return res.status(401).json({ message: 'Invalid simulator key' });
    }

    const { slotId, status } = req.body;
    if (!slotId || !status)
      return res.status(400).json({ message: 'slotId and status are required' });

    // Simulator is only allowed to set available or occupied — not reserved
    if (!['available', 'occupied'].includes(status))
      return res.status(400).json({ message: 'Simulator may only set status to available or occupied' });

    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });

    // Never override a slot that a driver has reserved — that would invalidate their booking
    if (slot.status === 'reserved') {
      return res.status(409).json({ message: 'Cannot override a reserved slot' });
    }

    slot.status = status;
    await slot.save();

    const lotId = slot.lot.toString();
    const io = getIo();
    io.to(`lot:${lotId}`).emit('slot:updated', slot);

    const availableCount = await Slot.countDocuments({ lot: lotId, status: 'available' });
    io.to(`lot:${lotId}`).emit('lot:availability', { lotId, availableCount });

    await createOccupancySnapshot(lotId);

    res.json(slot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
