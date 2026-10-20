import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import Reservation from '../models/Reservation.js';

export const getMyTickets = async (req, res) => {
  try {
    const userReservations = await Reservation.find({ user: req.user._id }).select('_id');
    const userResIds = userReservations.map((r) => r._id);

    const tickets = await Ticket.find({
      $or: [
        { user: req.user._id },
        { reservation: { $in: userResIds } },
      ],
    })
      .populate('lot', 'name address hourlyRate')
      .populate({ path: 'reservation', populate: { path: 'slot', select: 'label' } })
      .sort({ createdAt: -1 });
    console.log(`[Tickets] Fetched ${tickets.length} tickets for user ${req.user.email} (${req.user._id})`);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket ID format' });
    }
    const ticket = await Ticket.findById(req.params.id)
      .populate('lot', 'name address hourlyRate')
      .populate({ path: 'reservation', populate: { path: 'slot', select: 'label' } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    // Allow ticket owner, platform admins, admins, and guards
    const isOwner = ticket.user.toString() === req.user._id.toString();
    const isStaff = ['platform_admin', 'admin', 'guard'].includes(req.user.role);
    if (!isOwner && !isStaff)
      return res.status(403).json({ message: 'Forbidden' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
