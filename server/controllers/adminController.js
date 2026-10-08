import Ticket from '../models/Ticket.js';
import ParkingLot from '../models/ParkingLot.js';
import Slot from '../models/Slot.js';
import OccupancySnapshot from '../models/OccupancySnapshot.js';

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
    const lots = await ParkingLot.find().sort({ createdAt: -1 });

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
  console.error('Occupancy metrics error:', err);
  res.status(500).json({ message: err.message });
}
};