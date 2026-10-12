import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import ParkingLot from '../models/ParkingLot.js';
import Slot from '../models/Slot.js';
import OccupancySnapshot from '../models/OccupancySnapshot.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { getIo } from '../config/io.js';

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

// GET /api/owner/lots — returns lots owned by this approved owner
export const getOwnerLots = async (req, res) => {
  try {
    const lots = await ParkingLot.find({ owner: req.user._id }).sort({ createdAt: -1 });

    const lotsWithOccupancy = await Promise.all(
      lots.map(async (lot) => {
        const [occupiedSlots, reservedSlots, availableSlots] = await Promise.all([
          Slot.countDocuments({ lot: lot._id, status: 'occupied' }),
          Slot.countDocuments({ lot: lot._id, status: 'reserved' }),
          Slot.countDocuments({ lot: lot._id, status: 'available' }),
        ]);

        return {
          _id: lot._id,
          name: lot.name,
          address: lot.address,
          totalSlots: lot.totalSlots,
          hourlyRate: lot.hourlyRate,
          occupiedSlots,
          reservedSlots,
          availableSlots,
          occupancyPercent:
            lot.totalSlots > 0
              ? parseFloat(((occupiedSlots / lot.totalSlots) * 100).toFixed(1))
              : 0,
        };
      })
    );

    res.json(lotsWithOccupancy);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/owner/lots — approved owner creates a parking lot
export const createOwnerLot = async (req, res) => {
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

    const session = await mongoose.startSession();
    let lot;
    try {
      await session.withTransaction(async () => {
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
          owner: req.user._id,
        }], { session });
        lot = createdLot;

        const slotDocs = generateSlotLabels(parsedTotalSlots).map((label) => ({
          lot: createdLot._id,
          label,
          status: 'available',
        }));
        await Slot.insertMany(slotDocs, { session });
      });
    } finally {
      await session.endSession();
    }

    getIo().emit('lot:created', lot);
    res.status(201).json(lot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/owner/guards — list guards created by this owner
export const getOwnerGuards = async (req, res) => {
  try {
    const guards = await User.find({ role: 'guard', ownerId: req.user._id })
      .select('_id name email role assignedLots createdAt')
      .populate('assignedLots', 'name address')
      .sort({ createdAt: 1 });
    res.json(guards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/owner/guards — create a guard for this owner and assign lots
export const createOwnerGuard = async (req, res) => {
  try {
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const { password, assignedLots = [] } = body;

    if (!name || !email || typeof password !== 'string')
      return res.status(400).json({ message: 'name, email and password are required' });
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (!Array.isArray(assignedLots)) return res.status(400).json({ message: 'assignedLots must be an array of lot IDs' });

    if (await User.exists({ email })) return res.status(409).json({ message: 'Email already registered' });

    // Validate that all assigned lots belong to this owner
    let validLotIds = [];
    if (Array.isArray(assignedLots) && assignedLots.length > 0) {
      const ownedLots = await ParkingLot.find({
        _id: { $in: assignedLots },
        owner: req.user._id,
      }).select('_id');
      validLotIds = ownedLots.map((l) => l._id);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const guard = await User.create({
      name,
      email,
      passwordHash,
      role: 'guard',
      ownerId: req.user._id,
      assignedLots: validLotIds,
    });

    const populatedGuard = await User.findById(guard._id)
      .select('_id name email role assignedLots createdAt')
      .populate('assignedLots', 'name address');

    res.status(201).json(populatedGuard);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/owner/guards/:id/assign — update guard lot assignments
export const assignGuardLots = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedLots } = req.body;

    if (!Array.isArray(assignedLots)) {
      return res.status(400).json({ message: 'assignedLots must be an array of lot IDs' });
    }

    const guard = await User.findOne({ _id: id, role: 'guard', ownerId: req.user._id });
    if (!guard) return res.status(404).json({ message: 'Guard account not found for this owner' });

    // Validate that all requested lots belong to this owner
    const ownedLots = await ParkingLot.find({
      _id: { $in: assignedLots },
      owner: req.user._id,
    }).select('_id');

    guard.assignedLots = ownedLots.map((l) => l._id);
    await guard.save();

    const updated = await User.findById(guard._id)
      .select('_id name email role assignedLots createdAt')
      .populate('assignedLots', 'name address');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/owner/metrics/revenue — revenue restricted to owner's lots
export const getOwnerRevenue = async (req, res) => {
  try {
    const ownerLots = await ParkingLot.find({ owner: req.user._id }).select('_id name');
    const lotIds = ownerLots.map((l) => l._id);

    if (lotIds.length === 0) {
      return res.json({
        totalRevenue: 0,
        totalSessions: 0,
        revenueByLot: [],
        recentTickets: [],
      });
    }

    const tickets = await Ticket.find({ status: 'exited', lot: { $in: lotIds } })
      .populate('lot', 'name')
      .populate('user', 'name email')
      .populate({ path: 'reservation', populate: { path: 'slot', select: 'label' } })
      .sort({ exitedAt: -1 });

    const totalRevenue = tickets.reduce((sum, t) => sum + (t.amount || 0), 0);

    const revenueByLot = {};
    for (const ticket of tickets) {
      const lotName = ticket.lot?.name || 'Unknown';
      revenueByLot[lotName] = (revenueByLot[lotName] || 0) + (ticket.amount || 0);
    }

    const revenueByLotArray = Object.entries(revenueByLot).map(([name, revenue]) => ({
      name,
      revenue: parseFloat(revenue.toFixed(2)),
    }));

    res.json({
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalSessions: tickets.length,
      revenueByLot: revenueByLotArray,
      recentTickets: tickets.slice(0, 20),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/owner/metrics/occupancy — occupancy restricted to owner's lots
export const getOwnerOccupancy = async (req, res) => {
  try {
    const lots = await ParkingLot.find({ owner: req.user._id });
    const lotIds = lots.map((l) => l._id);

    if (lotIds.length === 0) {
      return res.json({ lotsWithOccupancy: [], snapshots: [] });
    }

    const lotsWithOccupancy = await Promise.all(
      lots.map(async (lot) => {
        const [occupiedCount, reservedCount, availableCount] = await Promise.all([
          Slot.countDocuments({ lot: lot._id, status: 'occupied' }),
          Slot.countDocuments({ lot: lot._id, status: 'reserved' }),
          Slot.countDocuments({ lot: lot._id, status: 'available' }),
        ]);
        return {
          lotId: lot._id,
          name: lot.name,
          totalSlots: lot.totalSlots,
          occupiedCount,
          reservedCount,
          availableCount,
          occupancyPercent: parseFloat(((occupiedCount / lot.totalSlots) * 100).toFixed(1)),
        };
      })
    );

    const snapshots = await OccupancySnapshot.find({
      lot: { $in: lotIds },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .sort({ timestamp: 1 })
      .populate('lot', 'name');

    res.json({ lotsWithOccupancy, snapshots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
