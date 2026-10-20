import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    status: {
      type: String,
      enum: ['reserved', 'checked_in', 'completed', 'cancelled'],
      default: 'reserved',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Reservation', reservationSchema);
