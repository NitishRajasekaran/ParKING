import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
    label: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['available', 'reserved', 'occupied'],
      default: 'available',
    },
  },
  { timestamps: true }
);

// Slot labels must be unique within a parking lot
slotSchema.index({ lot: 1, label: 1 }, { unique: true });

export default mongoose.model('Slot', slotSchema);
