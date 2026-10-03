import Slot from '../models/Slot.js';
import Reservation from '../models/Reservation.js';
import Ticket from '../models/Ticket.js';
import generateQrToken from '../utils/generateQrToken.js';
import { createOccupancySnapshot } from '../services/occupancyService.js';
import { getIo } from '../config/io.js';

export const createReservation = async (req, res) => {
  try {
    const { slotId, lotId } = req.body;
    if (!slotId || !lotId)
      return res.status(400).json({ message: 'slotId and lotId are required' });

    // ATOMIC double-booking protection:
    // findOneAndUpdate only succeeds when the slot is currently 'available'.
    // If another request reserved it first, this returns null → 409.
    const slot = await Slot.findOneAndUpdate(
      { _id: slotId, status: 'available' },
      { $set: { status: 'reserved' } },
      { new: true }
    );

    if (!slot) {
      return res.status(409).json({ message: 'Slot is no longer available — someone just took it' });
    }

    const reservation = await Reservation.create({
      user: req.user._id,
      lot: lotId,
      slot: slotId,
      status: 'reserved',
    });

    const ticket = await Ticket.create({
      reservation: reservation._id,
      user: req.user._id,
      lot: lotId,
      qrToken: generateQrToken(),
      status: 'issued',
    });

    const io = getIo();
    const lotRoom = `lot:${lotId}`;

    // Broadcast the slot status change to everyone watching this lot
    io.to(lotRoom).emit('slot:updated', slot);
    io.to(lotRoom).emit('reservation:created', { reservation, ticket });

    const availableCount = await Slot.countDocuments({ lot: lotId, status: 'available' });
    io.to(lotRoom).emit('lot:availability', { lotId, availableCount });

    await createOccupancySnapshot(lotId);

    res.status(201).json({ reservation, ticket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user._id })
      .populate('lot', 'name address hourlyRate')
      .populate('slot', 'label status')
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
