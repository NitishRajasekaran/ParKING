import Slot from '../models/Slot.js';
import Reservation from '../models/Reservation.js';
import Ticket from '../models/Ticket.js';
import ParkingLot from '../models/ParkingLot.js';
import generateQrToken from '../utils/generateQrToken.js';
import { createOccupancySnapshot } from '../services/occupancyService.js';
import { getIo } from '../config/io.js';
import mongoose from 'mongoose';
import { withTransaction } from '../utils/transaction.js';
import { randomBytes } from 'crypto';

const createTicketCode = () => {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(10);
  return `PK-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')}`;
};

const createUniqueTicketCode = async (session) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketCode = createTicketCode();
    if (!(await Ticket.exists({ ticketCode }).session(session))) return ticketCode;
  }
  throw new Error('Could not generate a unique ticket code');
};

export const createReservation = async (req, res) => {
  try {
    const { slotId, lotId } = req.body;
    if (!slotId || !lotId)
      return res.status(400).json({ message: 'slotId and lotId are required' });
    if (!mongoose.isValidObjectId(slotId) || !mongoose.isValidObjectId(lotId))
      return res.status(400).json({ message: 'slotId and lotId must be valid ObjectIds' });

    // Validate that the parking lot exists
    const lot = await ParkingLot.findById(lotId);
    if (!lot) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }

    // Validate that the slot exists and belongs to the requested parking lot
    const slotDoc = await Slot.findOne({ _id: slotId, lot: lotId });
    if (!slotDoc) {
      return res.status(404).json({ message: 'Slot not found in the requested parking lot' });
    }
    if (slotDoc.status !== 'available') {
      return res.status(409).json({ message: `Slot is ${slotDoc.status} and cannot be reserved` });
    }

    // ATOMIC double-booking protection:
    // findOneAndUpdate only succeeds when the slot is currently 'available'.
    // If another request reserved it first, this returns null → 409.
    let slot;
    let reservation;
    let ticket;

    await withTransaction(async (session) => {
      slot = undefined;
      reservation = undefined;
      ticket = undefined;

      slot = await Slot.findOneAndUpdate(
        { _id: slotId, lot: lotId, status: 'available' },
        { $set: { status: 'reserved' } },
        { new: true, session }
      );
      if (!slot) return;

      [reservation] = await Reservation.create([{
        user: req.user._id,
        lot: lotId,
        slot: slotId,
        status: 'reserved',
      }], { session });

      [ticket] = await Ticket.create([{
        reservation: reservation._id,
        user: req.user._id,
        lot: lotId,
        qrToken: generateQrToken(),
        ticketCode: await createUniqueTicketCode(session),
        status: 'issued',
      }], { session });

      await createOccupancySnapshot(lotId, session);
    });

    if (!slot) {
      return res.status(409).json({ message: 'Slot is no longer available or was just reserved' });
    }

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('lot', 'name address hourlyRate')
      .populate({ path: 'reservation', populate: { path: 'slot', select: 'label' } });
    const finalTicket = populatedTicket || ticket;

    const io = getIo();
    const lotRoom = `lot:${lotId}`;
    const userRoom = `user:${req.user._id.toString()}`;

    // Broadcast the slot status change to everyone watching this lot
    io.to(lotRoom).emit('slot:updated', slot);
    io.to(lotRoom).emit('reservation:created', { reservationId: reservation._id, ticketId: ticket._id, ticket: finalTicket });
    io.to(userRoom).emit('reservation:created', { reservationId: reservation._id, ticketId: ticket._id, ticket: finalTicket });

    const availableCount = await Slot.countDocuments({ lot: lotId, status: 'available' });
    io.to(lotRoom).emit('lot:availability', { lotId, availableCount });

    res.status(201).json({ reservation, ticket: finalTicket });
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
