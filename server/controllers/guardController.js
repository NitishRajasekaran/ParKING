import Ticket from '../models/Ticket.js';
import Slot from '../models/Slot.js';
import Reservation from '../models/Reservation.js';
import { createOccupancySnapshot } from '../services/occupancyService.js';
import { getIo } from '../config/io.js';

// Validate a QR token — returns ticket details without changing state
export const validateTicket = async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ message: 'qrToken is required' });

    const ticket = await Ticket.findOne({ qrToken })
      .populate('lot', 'name address')
      .populate({ path: 'reservation', populate: { path: 'slot', select: 'label status' } })
      .populate('user', 'name email');

    if (!ticket) return res.status(404).json({ message: 'Invalid QR code — ticket not found' });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Confirm vehicle entry: issued → entered, slot reserved → occupied
export const confirmEntry = async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ message: 'qrToken is required' });

    const ticket = await Ticket.findOne({ qrToken }).populate('reservation');
    if (!ticket) return res.status(404).json({ message: 'Invalid QR code' });

    if (ticket.status === 'entered')
      return res.status(409).json({ message: 'Vehicle has already entered' });
    if (ticket.status === 'exited')
      return res.status(409).json({ message: 'Ticket has already exited' });
    // Only 'issued' tickets can be entered
    if (ticket.status !== 'issued')
      return res.status(409).json({ message: `Invalid ticket state: ${ticket.status}` });

    ticket.status = 'entered';
    ticket.enteredAt = new Date();
    await ticket.save();

    // reserved → occupied
    const slot = await Slot.findByIdAndUpdate(
      ticket.reservation.slot,
      { $set: { status: 'occupied' } },
      { new: true }
    );

    await Reservation.findByIdAndUpdate(ticket.reservation._id, { status: 'checked_in' });

    const lotId = ticket.lot.toString();
    const io = getIo();
    io.to(`lot:${lotId}`).emit('slot:updated', slot);
    io.to(`lot:${lotId}`).emit('ticket:entry', { ticketId: ticket._id, slotId: slot._id });

    const availableCount = await Slot.countDocuments({ lot: lotId, status: 'available' });
    io.to(`lot:${lotId}`).emit('lot:availability', { lotId, availableCount });

    await createOccupancySnapshot(lotId);

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Confirm vehicle exit: entered → exited, slot occupied → available, calculate revenue
export const confirmExit = async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ message: 'qrToken is required' });

    const ticket = await Ticket.findOne({ qrToken })
      .populate('reservation')
      .populate('lot', 'hourlyRate name');
    if (!ticket) return res.status(404).json({ message: 'Invalid QR code' });

    if (ticket.status === 'issued')
      return res.status(409).json({ message: 'Vehicle has not entered yet' });
    if (ticket.status === 'exited')
      return res.status(409).json({ message: 'Ticket has already exited' });
    if (ticket.status !== 'entered')
      return res.status(409).json({ message: `Invalid ticket state: ${ticket.status}` });

    const exitedAt = new Date();
    // Calculate duration in hours and apply hourly rate
    const durationHours = (exitedAt - ticket.enteredAt) / (1000 * 60 * 60);
    const amount = parseFloat((durationHours * ticket.lot.hourlyRate).toFixed(2));

    ticket.status = 'exited';
    ticket.exitedAt = exitedAt;
    ticket.amount = amount;
    await ticket.save();

    // occupied → available
    const slot = await Slot.findByIdAndUpdate(
      ticket.reservation.slot,
      { $set: { status: 'available' } },
      { new: true }
    );

    await Reservation.findByIdAndUpdate(ticket.reservation._id, { status: 'completed' });

    const lotId = ticket.lot._id.toString();
    const io = getIo();
    io.to(`lot:${lotId}`).emit('slot:updated', slot);
    io.to(`lot:${lotId}`).emit('ticket:exit', { ticketId: ticket._id, slotId: slot._id, amount });

    const availableCount = await Slot.countDocuments({ lot: lotId, status: 'available' });
    io.to(`lot:${lotId}`).emit('lot:availability', { lotId, availableCount });

    await createOccupancySnapshot(lotId);

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
