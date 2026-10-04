import Slot from '../models/Slot.js';
import OccupancySnapshot from '../models/OccupancySnapshot.js';

// Count occupied slots and record a snapshot for a given parking lot.
// Called whenever slot occupancy changes (reservation, entry, exit, simulator).
export const createOccupancySnapshot = async (lotId, session = null) => {
  const [occupiedCount, totalSlots] = await Promise.all([
    Slot.countDocuments({ lot: lotId, status: 'occupied' }).session(session),
    Slot.countDocuments({ lot: lotId }).session(session),
  ]);

  await OccupancySnapshot.create([{ lot: lotId, occupiedCount, totalSlots }], { session });
  return { occupiedCount, totalSlots };
};
