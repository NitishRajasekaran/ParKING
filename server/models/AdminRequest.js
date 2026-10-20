import mongoose from 'mongoose';

const adminRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['password_reset', 'slot_cancellation'],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      default: '',
    },
    userRole: {
      type: String,
      enum: ['driver', 'owner', 'guard', 'platform_admin', 'admin'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // For password_reset:
    pendingPasswordHash: {
      type: String,
    },
    // For slot_cancellation:
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    lot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLot',
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('AdminRequest', adminRequestSchema);
