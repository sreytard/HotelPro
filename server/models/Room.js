const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: [true, 'Room number is required'], unique: true, trim: true },
    type: { type: String, enum: ['single', 'double', 'deluxe', 'suite'], required: [true, 'Room type is required'] },
    pricePerNight: { type: Number, required: [true, 'Price is required'], min: [1, 'Price must be positive'] },
    capacity: { type: Number, required: true, min: 1, max: 10, default: 2 },
    description: { type: String, trim: true, maxlength: 600 },
    amenities: [{ type: String, trim: true }],
    images: [{ type: String, trim: true }],
    // "maintenance" rooms are hidden from guests and cannot be booked
    status: { type: String, enum: ['available', 'maintenance'], default: 'available' },
    // Housekeeping: a room becomes "dirty" after check-out and staff mark it clean again
    housekeeping: { type: String, enum: ['clean', 'dirty', 'cleaning'], default: 'clean' },
    // Maintained automatically from guest reviews
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
