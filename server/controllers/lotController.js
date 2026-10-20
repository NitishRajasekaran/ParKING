import ParkingLot from '../models/ParkingLot.js';
import Slot from '../models/Slot.js';
import { getIo } from '../config/io.js';
import { withTransaction } from '../utils/transaction.js';
import mongoose from 'mongoose';

// Generate labels A1–A10, B1–B10, … for a given total count
const generateSlotLabels = (total) => {
  const labels = [];
  const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const perRow = 10;
  for (let i = 0; i < total; i++) {
    const row = rows[Math.floor(i / perRow)];
    const num = (i % perRow) + 1;
    labels.push(`${row}${num}`);
  }
  return labels;
};

export const createLot = async (req, res) => {
  try {
    const { name, address, latitude, longitude, totalSlots, hourlyRate } = req.body;
    const parseNumber = (value) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      if (typeof value !== 'string' || value.trim() === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const parsedLatitude = parseNumber(latitude);
    const parsedLongitude = parseNumber(longitude);
    const parsedHourlyRate = parseNumber(hourlyRate);
    const parsedTotalSlots = parseNumber(totalSlots);

    if (typeof name !== 'string' || !name.trim())
      return res.status(400).json({ message: 'name must be a non-empty string' });
    if (typeof address !== 'string' || !address.trim())
      return res.status(400).json({ message: 'address must be a non-empty string' });
    if (parsedLatitude === null || parsedLatitude < -90 || parsedLatitude > 90)
      return res.status(400).json({ message: 'latitude must be a finite number between -90 and 90' });
    if (parsedLongitude === null || parsedLongitude < -180 || parsedLongitude > 180)
      return res.status(400).json({ message: 'longitude must be a finite number between -180 and 180' });
    if (parsedHourlyRate === null || parsedHourlyRate < 0)
      return res.status(400).json({ message: 'hourlyRate must be a finite number greater than or equal to 0' });
    if (!Number.isInteger(parsedTotalSlots) || parsedTotalSlots < 1 || parsedTotalSlots > 260)
      return res.status(400).json({ message: 'totalSlots must be a positive integer no greater than 260' });

    let lot;
    await withTransaction(async (session) => {
      const [createdLot] = await ParkingLot.create([{
        name: name.trim(),
        address: address.trim(),
        location: {
          type: 'Point',
          coordinates: [parsedLongitude, parsedLatitude],
        },
        totalSlots: parsedTotalSlots,
        hourlyRate: parsedHourlyRate,
        createdBy: req.user._id,
        owner: req.user.role === 'owner' ? req.user._id : (req.body.owner || null),
      }], { session });
      lot = createdLot;

      const slotDocs = generateSlotLabels(parsedTotalSlots).map((label) => ({
        lot: createdLot._id,
        label,
        status: 'available',
      }));
      try {
        await Slot.insertMany(slotDocs, { session });
      } catch (insertErr) {
        if (!session) {
          await ParkingLot.findByIdAndDelete(createdLot._id);
        }
        throw insertErr;
      }
    });

    // Notify all connected clients that a new lot exists
    getIo().emit('lot:created', lot);

    res.status(201).json(lot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getNearbyLots = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng)
      return res.status(400).json({ message: 'lat and lng query parameters are required' });

    const maxDistance = radius ? Math.min(Math.max(Number(radius), 100), 100000) : 5000;

    const lots = await ParkingLot.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: maxDistance,
        },
      },
    });

    // Attach live availability count and slot metrics to each lot
    const result = await Promise.all(
      lots.map(async (lot) => {
        const [availableSlots, occupiedSlots, reservedSlots] = await Promise.all([
          Slot.countDocuments({ lot: lot._id, status: 'available' }),
          Slot.countDocuments({ lot: lot._id, status: 'occupied' }),
          Slot.countDocuments({ lot: lot._id, status: 'reserved' }),
        ]);
        return {
          ...lot.toObject(),
          availableCount: availableSlots,
          availableSlots,
          occupiedSlots,
          reservedSlots,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLotById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'Invalid parking lot ID' });
    const lot = await ParkingLot.findById(req.params.id).populate('createdBy', 'name');
    if (!lot) return res.status(404).json({ message: 'Parking lot not found' });
    const [availableSlots, occupiedSlots, reservedSlots] = await Promise.all([
      Slot.countDocuments({ lot: lot._id, status: 'available' }),
      Slot.countDocuments({ lot: lot._id, status: 'occupied' }),
      Slot.countDocuments({ lot: lot._id, status: 'reserved' }),
    ]);
    res.json({
      ...lot.toObject(),
      availableCount: availableSlots,
      availableSlots,
      occupiedSlots,
      reservedSlots,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLotSlots = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'Invalid parking lot ID' });
    const slots = await Slot.find({ lot: req.params.id }).sort({ label: 1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllLots = async (req, res) => {
  try {
    const lots = await ParkingLot.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('owner', 'name email');

    const lotsWithOccupancy = await Promise.all(
      lots.map(async (lot) => {
        const [availableSlots, occupiedSlots, reservedSlots] = await Promise.all([
          Slot.countDocuments({ lot: lot._id, status: 'available' }),
          Slot.countDocuments({ lot: lot._id, status: 'occupied' }),
          Slot.countDocuments({ lot: lot._id, status: 'reserved' }),
        ]);
        return {
          ...lot.toObject(),
          availableCount: availableSlots,
          availableSlots,
          occupiedSlots,
          reservedSlots,
        };
      })
    );

    res.json(lotsWithOccupancy);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteSlot = async (req, res) => {
  try {
    const { lotId, slotId } = req.params;
    if (!mongoose.isValidObjectId(lotId) || !mongoose.isValidObjectId(slotId)) {
      return res.status(400).json({ message: 'Invalid lot or slot ID format' });
    }

    const lot = await ParkingLot.findById(lotId);
    if (!lot) return res.status(404).json({ message: 'Parking lot not found' });

    const isOwner =
      req.user.role === 'owner' &&
      (String(lot.owner) === String(req.user._id) || String(lot.createdBy) === String(req.user._id));
    const isAdmin = ['platform_admin', 'admin'].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to manage this lot' });
    }

    const slot = await Slot.findOne({ _id: slotId, lot: lotId });
    if (!slot) return res.status(404).json({ message: 'Slot not found in this lot' });

    if (slot.status !== 'available') {
      return res.status(400).json({ message: `Cannot delete slot with status '${slot.status}'. Only available slots can be deleted.` });
    }

    await Slot.findByIdAndDelete(slotId);
    await ParkingLot.findByIdAndUpdate(lotId, { $inc: { totalSlots: -1 } });

    const availableCount = await Slot.countDocuments({ lot: lotId, status: 'available' });
    const io = getIo();
    if (io) {
      io.to(`lot:${lotId}`).emit('slot:deleted', { lotId, slotId });
      io.to(`lot:${lotId}`).emit('lot:availability', { lotId, availableCount });
    }

    res.json({ message: 'Slot deleted successfully', slotId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

