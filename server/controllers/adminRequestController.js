import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import AdminRequest from '../models/AdminRequest.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Reservation from '../models/Reservation.js';
import Slot from '../models/Slot.js';
import ParkingLot from '../models/ParkingLot.js';
import { getIo } from '../config/io.js';
import { guardCanAccessLot } from './guardController.js';

const validEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// 1. Password Reset Request (Submitted by Driver / Owner / Guard on login/forgot-password)
export const submitPasswordResetRequest = async (req, res) => {
  try {
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;

    if (!email || typeof password !== 'string') {
      return res.status(400).json({ message: 'email and new password are required' });
    }
    if (!validEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const pendingPasswordHash = await bcrypt.hash(password, 10);

    let adminReq = await AdminRequest.findOne({
      user: user._id,
      type: 'password_reset',
      status: 'pending',
    });

    if (adminReq) {
      adminReq.pendingPasswordHash = pendingPasswordHash;
      adminReq.userRole = user.role;
      adminReq.userName = user.name;
      await adminReq.save();
    } else {
      adminReq = await AdminRequest.create({
        type: 'password_reset',
        user: user._id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        pendingPasswordHash,
        status: 'pending',
      });
    }

    const io = getIo();
    if (io) {
      io.emit('admin:request:created', adminReq);
    }

    res.json({
      message: 'Password reset request submitted. Awaiting Admin verification and approval.',
      requestId: adminReq._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Slot Cancellation Request (Submitted by Driver from ticket, or Owner/Guard from lot)
export const submitSlotCancellationRequest = async (req, res) => {
  try {
    const ticketId = req.params.id || req.body.ticketId;
    const { lotId, slotId, reason } = req.body;

    let ticket;
    let reservation;
    let targetLotId;
    let targetSlotId;

    if (ticketId) {
      if (!mongoose.isValidObjectId(ticketId)) {
        return res.status(400).json({ message: 'Invalid ticket ID' });
      }
      ticket = await Ticket.findById(ticketId).populate('lot').populate('reservation');
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      reservation = ticket.reservation;
      targetLotId = ticket.lot._id;
      targetSlotId = typeof reservation.slot === 'object' ? reservation.slot._id : reservation.slot;
    } else if (lotId && slotId) {
      if (!mongoose.isValidObjectId(lotId) || !mongoose.isValidObjectId(slotId)) {
        return res.status(400).json({ message: 'Invalid lot or slot ID' });
      }
      reservation = await Reservation.findOne({ lot: lotId, slot: slotId, status: 'reserved' });
      if (!reservation) {
        return res.status(404).json({ message: 'No active reservation found for this slot' });
      }
      ticket = await Ticket.findOne({ reservation: reservation._id }).populate('lot');
      targetLotId = lotId;
      targetSlotId = slotId;
    } else {
      return res.status(400).json({ message: 'ticketId or lotId + slotId is required' });
    }

    if (ticket && ticket.status !== 'issued') {
      return res.status(400).json({
        message: `Cannot cancel ticket with status '${ticket.status}'. Only issued/reserved tickets can be cancelled.`,
      });
    }

    // Role-based authorization
    const role = req.user.role;
    if (role === 'driver') {
      if (String(ticket.user) !== String(req.user._id)) {
        return res.status(403).json({ message: 'You can only request cancellation for your own tickets' });
      }
    } else if (role === 'owner') {
      const lot = await ParkingLot.findById(targetLotId);
      const isOwner =
        lot && (String(lot.owner) === String(req.user._id) || String(lot.createdBy) === String(req.user._id));
      if (!isOwner) {
        return res.status(403).json({ message: 'You do not have permission to manage this parking lot' });
      }
    } else if (role === 'guard') {
      if (!guardCanAccessLot(req.user, targetLotId)) {
        return res.status(403).json({ message: 'You can only manage slots in your assigned parking lots' });
      }
    }

    // Check if an existing pending cancellation already exists
    const existingReq = await AdminRequest.findOne({
      type: 'slot_cancellation',
      ticket: ticket._id,
      status: 'pending',
    });

    if (existingReq) {
      return res.status(200).json({
        message: 'Cancellation request is already pending admin verification.',
        request: existingReq,
      });
    }

    const adminReq = await AdminRequest.create({
      type: 'slot_cancellation',
      user: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      ticket: ticket._id,
      reservation: reservation._id,
      lot: targetLotId,
      slot: targetSlotId,
      reason: typeof reason === 'string' ? reason.trim() : '',
      status: 'pending',
    });

    const io = getIo();
    if (io) {
      io.emit('admin:request:created', adminReq);
    }

    res.status(201).json({
      message: 'Slot cancellation request submitted. Awaiting Admin verification and approval.',
      request: adminReq,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Get latest cancellation request for a ticket (for Driver UI feedback)
export const getTicketCancellationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }
    const adminReq = await AdminRequest.findOne({
      ticket: id,
      type: 'slot_cancellation',
    }).sort({ createdAt: -1 });

    res.json(adminReq || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Get all verification requests (Admin only)
export const getAdminRequests = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const requests = await AdminRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email role')
      .populate('lot', 'name address')
      .populate('slot', 'label status')
      .populate('ticket', 'ticketCode qrToken status')
      .populate('reviewedBy', 'name email');

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Approve Request (Platform Admin)
export const approveAdminRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    const request = await AdminRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Verification request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    if (request.type === 'password_reset') {
      const user = await User.findById(request.user);
      if (!user) {
        return res.status(404).json({ message: 'User account no longer exists' });
      }
      user.passwordHash = request.pendingPasswordHash;
      await user.save();
    } else if (request.type === 'slot_cancellation') {
      if (request.slot) {
        await Slot.findByIdAndUpdate(request.slot, { status: 'available' });
      }
      if (request.reservation) {
        await Reservation.findByIdAndUpdate(request.reservation, { status: 'cancelled' });
      }
      if (request.ticket) {
        await Ticket.findByIdAndUpdate(request.ticket, { status: 'cancelled' });
      }

      if (request.lot) {
        const availableCount = await Slot.countDocuments({ lot: request.lot, status: 'available' });
        const io = getIo();
        if (io) {
          io.to(`lot:${request.lot}`).emit('slot:updated', {
            _id: request.slot,
            lot: request.lot,
            status: 'available',
          });
          io.to(`lot:${request.lot}`).emit('lot:availability', {
            lotId: request.lot,
            availableCount,
          });
          io.to(`user:${request.user}`).emit('ticket:cancelled', {
            ticketId: request.ticket,
          });
        }
      }
    }

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    const io = getIo();
    if (io) {
      io.emit('admin:request:updated', request);
    }

    res.json({ message: 'Verification request approved successfully', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 6. Reject Request (Platform Admin)
export const rejectAdminRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    const request = await AdminRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Verification request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    request.status = 'rejected';
    request.reviewNotes = req.body.reason ? String(req.body.reason).trim() : '';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    const io = getIo();
    if (io) {
      io.emit('admin:request:updated', request);
    }

    res.json({ message: 'Verification request rejected', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
