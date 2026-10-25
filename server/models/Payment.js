const mongoose = require('mongoose');

// Mock payment record. Full card numbers are NEVER stored - only the last 4 digits.
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['card', 'upi', 'cash'], required: true },
    last4: { type: String },
    status: { type: String, enum: ['success', 'failed', 'refunded'], required: true },
    transactionId: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
