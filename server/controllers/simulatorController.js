import Slot from '../models/Slot.js';
import Reservation from '../models/Reservation.js';
import Ticket from '../models/Ticket.js';
import mongoose from 'mongoose';
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

    const session = await mongoose.startSession();
    let slot;
    let conflict = false;
    let slotFound = false;

    try {
      await session.withTransaction(async () => {
        slot = undefined;
        conflict = false;
        slotFound = false;

        const currentSlot = await Slot.findById(slotId).session(session);
        if (!currentSlot) return;
        slotFound = true;

        if (currentSlot.status === 'reserved') {
          conflict = true;
          return;
        }

        if (currentSlot.status === 'occupied' && status === 'available') {
          const slotReservations = await Reservation.find({ slot: currentSlot._id })
            .select('_id').session(session);
          const activeEnteredTicket = await Ticket.exists({
            reservation: { $in: slotReservations.map(({ _id }) => _id) },
            status: 'entered',
          }).session(session);

          if (activeEnteredTicket) {
            conflict = true;
            return;
          }
        }

        slot = await Slot.findOneAndUpdate(
          { _id: currentSlot._id, status: currentSlot.status },
          { $set: { status } },
          { new: true, session }
        );
        if (!slot) conflict = true;
      });
    } finally {
      await session.endSession();
    }

    if (!slotFound) return res.status(404).json({ message: 'Slot not found' });
    if (conflict) {
      return res.status(409).json({ message: 'Cannot modify a reserved slot or a slot with an active entered ticket' });
    }

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
