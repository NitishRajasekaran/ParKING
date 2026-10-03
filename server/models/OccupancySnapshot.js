import mongoose from 'mongoose';

const occupancySnapshotSchema = new mongoose.Schema({
  lot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
  timestamp: { type: Date, default: Date.now },
  occupiedCount: { type: Number, required: true },
  totalSlots: { type: Number, required: true },
});

export default mongoose.model('OccupancySnapshot', occupancySnapshotSchema);
