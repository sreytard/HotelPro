const mongoose = require('mongoose');

// One review per completed stay
const reviewSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 600 },
  },
  { timestamps: true }
);

reviewSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
