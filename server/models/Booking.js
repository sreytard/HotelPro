const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true, min: 1 },
    nights: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    // pending -> confirmed (after payment) -> checked-in -> checked-out | cancelled
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    // What the guest actually paid. If dates change later, total and paid can differ (balance on the invoice).
    amountPaid: { type: Number },
    // A guest asks to cancel a PAID booking; staff approve (refund) or reject
    cancelRequested: { type: Boolean, default: false },
    cancelReason: { type: String, maxlength: 300 },
    razorpayOrderId: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Short human-friendly booking ID shown to guests and in emails, e.g. HP-3F9A1C
bookingSchema.virtual('bookingCode').get(function () {
  return this._id ? `HP-${this._id.toString().slice(-6).toUpperCase()}` : undefined;
});

// Speeds up the availability / overlap queries and the listings
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
