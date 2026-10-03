import Ticket from '../models/Ticket.js';

export const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id })
      .populate('lot', 'name address hourlyRate')
      .populate({ path: 'reservation', populate: { path: 'slot', select: 'label' } })
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('lot', 'name address hourlyRate')
      .populate({ path: 'reservation', populate: { path: 'slot', select: 'label' } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    // Only the ticket owner can view their own ticket
    if (ticket.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Forbidden' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
