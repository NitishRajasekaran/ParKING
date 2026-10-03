import ParkingLot from '../models/ParkingLot.js';
import Slot from '../models/Slot.js';
import { getIo } from '../config/io.js';

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
    if (!name || !address || latitude == null || longitude == null || !totalSlots || hourlyRate == null)
      return res.status(400).json({ message: 'All fields are required' });

    const lot = await ParkingLot.create({
      name,
      address,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      totalSlots: parseInt(totalSlots),
      hourlyRate: parseFloat(hourlyRate),
      createdBy: req.user._id,
    });

    // Auto-generate all slots for this lot
    const slotDocs = generateSlotLabels(lot.totalSlots).map((label) => ({
      lot: lot._id,
      label,
      status: 'available',
    }));
    await Slot.insertMany(slotDocs);

    // Notify all connected clients that a new lot exists
    getIo().emit('lot:created', lot);

    res.status(201).json(lot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getNearbyLots = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng)
      return res.status(400).json({ message: 'lat and lng query parameters are required' });

    const lots = await ParkingLot.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 5000, // 5 km radius
        },
      },
    });

    // Attach live availability count to each lot
    const result = await Promise.all(
      lots.map(async (lot) => {
        const availableCount = await Slot.countDocuments({ lot: lot._id, status: 'available' });
        return { ...lot.toObject(), availableCount };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLotById = async (req, res) => {
  try {
    const lot = await ParkingLot.findById(req.params.id).populate('createdBy', 'name');
    if (!lot) return res.status(404).json({ message: 'Parking lot not found' });
    const availableCount = await Slot.countDocuments({ lot: lot._id, status: 'available' });
    res.json({ ...lot.toObject(), availableCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLotSlots = async (req, res) => {
  try {
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
      .populate('createdBy', 'name email');
    res.json(lots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
