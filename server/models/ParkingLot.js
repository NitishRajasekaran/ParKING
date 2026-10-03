import mongoose from 'mongoose';

const parkingLotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    // GeoJSON Point — coordinates are [longitude, latitude] per GeoJSON spec
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    totalSlots: { type: Number, required: true, min: 1 },
    hourlyRate: { type: Number, required: true, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Required for $near / $geoNear geospatial queries
parkingLotSchema.index({ location: '2dsphere' });

export default mongoose.model('ParkingLot', parkingLotSchema);
