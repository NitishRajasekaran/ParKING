import Ticket from '../models/Ticket.js';
import Slot from '../models/Slot.js';
import Reservation from '../models/Reservation.js';
import { createOccupancySnapshot } from '../services/occupancyService.js';
import { getIo } from '../config/io.js';

export const guardCanAccessLot = (guard, lotRef) => {
  if (!guard) return false;
  // Platform admins have platform-wide access
  if (guard.role === 'platform_admin' || guard.role === 'admin') return true;

  // Owners can access lots they own
  if (guard.role === 'owner') {
    const guardId = String(guard._id ?? '');
    const lotOwner = String(lotRef?.owner?._id ?? lotRef?.owner ?? '');
    return Boolean(lotOwner && lotOwner === guardId);
  }

  // Guards can access only their assigned lots
  const assignedLots = Array.isArray(guard.assignedLots) ? guard.assignedLots : [];
  const lotId = String(lotRef?._id ?? lotRef ?? '');
  return assignedLots.some((assigned) => String(assigned?._id ?? assigned) === lotId);
};

export const ticketLookupFilter = (ticketCode) => ({
  $or: [{ qrToken: ticketCode }, { ticketCode }],
});

/**
 * Calculates non-fractioned parking rent.
 * Even for a minute parked, the rate is charged at least once (1-hour minimum).
 * Any duration exceeding a whole hour is rounded up to the next full hour.
 */
export const calculateParkingFee = (enteredAt, exitedAt, hourlyRate) => {
  const rate = Number(hourlyRate) || 0;
  if (!enteredAt || !exitedAt) return rate;
  const start = new Date(enteredAt).getTime();
  const end = new Date(exitedAt).getTime();
  const durationMs = Math.max(0, end - start);
  const durationHours = durationMs / (1000 * 60 * 60);
  const billedHours = Math.max(1, Math.ceil(durationHours));
  return billedHours * rate;
};


// Validate a QR token — returns ticket details without changing state
export const validateTicket = async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (typeof qrToken !== 'string' || !qrToken.trim()) return res.status(400).json({ message: 'Ticket code is required' });

    const suppliedCode = qrToken.trim();
    const ticket = await Ticket.findOne(ticketLookupFilter(suppliedCode))
      .populate('lot', 'name address owner')
      .populate({ path: 'reservation', populate: { path: 'slot', select: 'label status' } })
      .populate('user', 'name email');

    if (!ticket) return res.status(404).json({ message: 'Invalid QR code — ticket not found' });
    if (!guardCanAccessLot(req.user, ticket.lot)) return res.status(403).json({ message: 'This ticket is outside your assigned parking lots' });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Confirm vehicle entry: issued → entered, slot reserved → occupied
export const confirmEntry = async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (typeof qrToken !== 'string' || !qrToken.trim()) return res.status(400).json({ message: 'Ticket code is required' });

    const suppliedCode = qrToken.trim();
    const ticket = await Ticket.findOne(ticketLookupFilter(suppliedCode))
      .populate('reservation')
      .populate('lot', 'name address owner');
    if (!ticket) return res.status(404).json({ message: 'Invalid QR code — ticket not found' });
    if (!guardCanAccessLot(req.user, ticket.lot)) return res.status(403).json({ message: 'This ticket is outside your assigned parking lots' });

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

    const lotId = ticket.lot._id ? ticket.lot._id.toString() : ticket.lot.toString();
    const io = getIo();
    io.to(`lot:${lotId}`).emit('slot:updated', slot);
    const availableCount = await Slot.countDocuments({ lot: lotId, status: 'available' });
    io.to(`lot:${lotId}`).emit('lot:availability', { lotId, availableCount });

    if (ticket.user) {
      io.to(`user:${ticket.user.toString()}`).emit('ticket:entry', { ticketId: ticket._id, slotId: slot._id });
    }

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
    if (typeof qrToken !== 'string' || !qrToken.trim()) return res.status(400).json({ message: 'Ticket code is required' });

    const suppliedCode = qrToken.trim();
    const ticket = await Ticket.findOne(ticketLookupFilter(suppliedCode))
      .populate('reservation')
      .populate('lot', 'hourlyRate name owner');
    if (!ticket) return res.status(404).json({ message: 'Invalid QR code — ticket not found' });
    if (!guardCanAccessLot(req.user, ticket.lot)) return res.status(403).json({ message: 'This ticket is outside your assigned parking lots' });

    if (ticket.status === 'issued')
      return res.status(409).json({ message: 'Vehicle has not entered yet' });
    if (ticket.status === 'exited')
      return res.status(409).json({ message: 'Ticket has already exited' });
    if (ticket.status !== 'entered')
      return res.status(409).json({ message: `Invalid ticket state: ${ticket.status}` });

    const exitedAt = new Date();
    const amount = calculateParkingFee(ticket.enteredAt, exitedAt, ticket.lot?.hourlyRate);

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
    const availableCount = await Slot.countDocuments({ lot: lotId, status: 'available' });
    io.to(`lot:${lotId}`).emit('lot:availability', { lotId, availableCount });

    if (ticket.user) {
      io.to(`user:${ticket.user.toString()}`).emit('ticket:exit', { ticketId: ticket._id, slotId: slot._id, amount });
    }

    await createOccupancySnapshot(lotId);

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
