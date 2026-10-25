const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { expireStalePending } = require('../utils/availability');
const { notifyChange } = require('../utils/socket');
const { emailBooking } = require('../utils/mailer');

const txnId = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`;

// POST /api/payments/:bookingId  (booking owner, staff, admin)
// MOCK payment - no real money moves.
//   card: 16 digits; a card ending in 0002 is declined (to demo failures)
//   upi : any id containing "@"
//   cash: staff/admin only (pay at front desk)
const payBooking = asyncHandler(async (req, res) => {
  await expireStalePending();
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) throw httpError(404, 'Booking not found');

  const staff = ['staff', 'admin'].includes(req.user.role);
  if (!staff && String(booking.user) !== String(req.user._id)) {
    throw httpError(403, 'You can only pay for your own bookings');
  }
  if (booking.status !== 'pending' || booking.paymentStatus === 'paid') {
    throw httpError(400, 'This booking is not awaiting payment (it may have expired or already been paid)');
  }

  const { method, cardNumber, upiId } = req.body;
  if (!['card', 'upi', 'cash'].includes(method)) throw httpError(400, 'Choose a payment method');
  if (method === 'cash' && !staff) throw httpError(400, 'Cash payments are handled at the front desk');

  let last4;
  if (method === 'card') {
    const digits = String(cardNumber || '').replace(/\s+/g, '');
    if (!/^\d{16}$/.test(digits)) throw httpError(400, 'Enter a valid 16-digit card number');
    last4 = digits.slice(-4);
  }
  if (method === 'upi' && !/^[\w.\-]{2,}@[\w]{2,}$/.test(String(upiId || ''))) {
    throw httpError(400, 'Enter a valid UPI id (e.g. name@bank)');
  }

  const base = { booking: booking._id, user: booking.user, amount: booking.totalPrice, method, last4, transactionId: txnId() };

  // Simulated decline
  if (last4 === '0002') {
    await Payment.create({ ...base, status: 'failed' });
    throw httpError(402, 'Card declined (test card). Please try another card.');
  }

  const payment = await Payment.create({ ...base, status: 'success' });
  booking.paymentStatus = 'paid';
  booking.status = 'confirmed';
  await booking.save();
  notifyChange('booking', booking.room);
  emailBooking('confirmed', booking._id);
  res.status(201).json({ payment, booking });
});

// GET /api/payments/my  (logged in)
const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(payments);
});

// GET /api/payments  (admin)
const getAllPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(300);
  res.json(payments);
});

module.exports = { payBooking, getMyPayments, getAllPayments };
