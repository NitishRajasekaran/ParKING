import Ticket from '../models/Ticket.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ParkingLot from '../models/ParkingLot.js';
import Slot from '../models/Slot.js';
import OccupancySnapshot from '../models/OccupancySnapshot.js';

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const getStaffUsers = async (_req, res) => {
  try {
    const users = await User.find({ role: { $in: ['platform_admin', 'admin', 'guard'] } })
      .select('_id name email role createdAt')
      .sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createStaffUser = async (req, res) => {
  try {
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const { password, role } = body;
    if (!name || !email || typeof password !== 'string' || !role)
      return res.status(400).json({ message: 'name, email, password and role are required' });
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (role !== 'platform_admin' && role !== 'guard')
      return res.status(400).json({ message: 'role must be platform_admin or guard' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    res.status(500).json({ message: err.message });
  }
};
export const getRevenue = async (req, res) => {
  try {
    const tickets = await Ticket.find({ status: 'exited' })
      .populate('lot', 'name')
      .populate('user', 'name email')
      .populate({ path: 'reservation', populate: { path: 'slot', select: 'label' } })
      .sort({ exitedAt: -1 });

    const totalRevenue = tickets.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Aggregate revenue per lot name
    const revenueByLot = {};
    for (const ticket of tickets) {
      const lotName = ticket.lot?.name || 'Unknown';
      revenueByLot[lotName] = (revenueByLot[lotName] || 0) + (ticket.amount || 0);
    }

    // Format for chart consumption
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

export const getOccupancy = async (req, res) => {
  try {
    const lots = await ParkingLot.find();

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

    // Last 24 hours of snapshots for trend chart
    const snapshots = await OccupancySnapshot.find({
      lot: { $in: lots.map((l) => l._id) },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .sort({ timestamp: 1 })
      .populate('lot', 'name');

    res.json({ lotsWithOccupancy, snapshots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getAdminLots = async (req, res) => {
  try {
    const lots = await ParkingLot.find().populate('owner', 'name email').sort({ createdAt: -1 });

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
          owner: lot.owner,
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
    console.error('Occupancy metrics error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getPendingOwnerApplications = async (_req, res) => {
  try {
    const owners = await User.find({ role: 'owner', ownerStatus: 'pending' })
      .select('_id name email role ownerStatus createdAt updatedAt')
      .sort({ createdAt: -1 });
    res.json(owners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOwnerApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { role: 'owner' };
    if (status && ['none', 'pending', 'approved', 'rejected'].includes(status)) {
      filter.ownerStatus = status;
    }
    const owners = await User.find(filter)
      .select('_id name email role ownerStatus createdAt updatedAt')
      .sort({ createdAt: -1 });
    res.json(owners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const approveOwnerApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Owner account not found' });
    if (user.role !== 'owner') {
      return res.status(400).json({ message: 'Target account is not an owner' });
    }
    user.ownerStatus = 'approved';
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const rejectOwnerApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Owner account not found' });
    if (user.role !== 'owner') {
      return res.status(400).json({ message: 'Target account is not an owner' });
    }
    user.ownerStatus = 'rejected';
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const assignLotOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { ownerId } = req.body;

    const lot = await ParkingLot.findById(id);
    if (!lot) return res.status(404).json({ message: 'Parking lot not found' });

    if (ownerId) {
      const owner = await User.findById(ownerId);
      if (!owner || owner.role !== 'owner' || owner.ownerStatus !== 'approved') {
        return res.status(400).json({ message: 'Assigned owner must be an approved owner account' });
      }
      lot.owner = owner._id;
    } else {
      lot.owner = null;
    }

    await lot.save();
    const updatedLot = await ParkingLot.findById(lot._id).populate('owner', 'name email');
    res.json(updatedLot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};