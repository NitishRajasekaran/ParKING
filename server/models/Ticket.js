import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
    // Opaque random hex token — placed in QR code, no user data embedded
    qrToken: { type: String, required: true, unique: true },
    status: { type: String, enum: ['issued', 'entered', 'exited'], default: 'issued' },
    enteredAt: { type: Date },
    exitedAt: { type: Date },
    // Amount calculated on exit: durationHours * hourlyRate
    amount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Ticket', ticketSchema);
