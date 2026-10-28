const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { expireStalePending } = require('../utils/availability');
const { notifyChange } = require('../utils/socket');
const { emailBooking } = require('../utils/mailer');
const { createNotification, notifyStaff } = require('../utils/notify');
const { logActivity } = require('../utils/audit');
const { pageParams, pageResult } = require('../utils/paginate');

const txnId = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`;
const razorpayEnabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

// Loads a booking that is waiting for payment and checks the caller may pay for it
const loadPayableBooking = async (req) => {
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
  return { booking, staff };
};

// Records a successful payment and confirms the booking (used by every payment method)
const markPaid = async (req, booking, { method, last4, transactionId }) => {
  const payment = await Payment.create({
    booking: booking._id, user: booking.user, amount: booking.totalPrice, method, last4, status: 'success', transactionId,
  });
  booking.paymentStatus = 'paid';
  booking.status = 'confirmed';
  booking.amountPaid = booking.totalPrice;
  await booking.save();

  notifyChange('booking', booking.room);
  emailBooking('confirmed', booking._id);
  logActivity(req, 'payment', `${booking.bookingCode} ${method} ₹${booking.totalPrice}`);
  createNotification(booking.user, { title: 'Payment received', message: `${booking.bookingCode} is confirmed. See you soon!`, type: 'success', link: '/my-bookings' });
  notifyStaff({ title: 'New confirmed booking', message: `${booking.bookingCode} was paid (₹${booking.totalPrice}).`, type: 'info', link: '/staff/bookings' });
  return payment;
};

// GET /api/payments/config  (logged in) - tells the frontend which gateways are available
const getConfig = (req, res) => {
  res.json({ razorpay: razorpayEnabled(), razorpayKeyId: razorpayEnabled() ? process.env.RAZORPAY_KEY_ID : null });
};

// POST /api/payments/:bookingId  (booking owner, staff, admin)
// MOCK payment - no real money moves.
//   card: 16 digits; a card ending in 0002 is declined (to demo failures)
//   upi : any id containing "@"
//   cash: staff/admin only (pay at front desk)
const payBooking = asyncHandler(async (req, res) => {
  const { booking, staff } = await loadPayableBooking(req);

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

  // Simulated decline
  if (last4 === '0002') {
    await Payment.create({ booking: booking._id, user: booking.user, amount: booking.totalPrice, method, last4, status: 'failed', transactionId: txnId() });
    logActivity(req, 'payment_failed', `${booking.bookingCode} card ending ${last4}`, 'warn');
    throw httpError(402, 'Card declined (test card). Please try another card.');
  }

  const payment = await markPaid(req, booking, { method, last4, transactionId: txnId() });
  res.status(201).json({ payment, booking });
});

// POST /api/payments/:bookingId/razorpay/order  - step 1 of Razorpay (test mode) checkout
const createRazorpayOrder = asyncHandler(async (req, res) => {
  if (!razorpayEnabled()) throw httpError(503, 'Razorpay is not configured on this server');
  const { booking } = await loadPayableBooking(req);

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const apiBase = process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com';
  let response;
  let order;
  try {
    response = await fetch(`${apiBase}/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: Math.round(booking.totalPrice * 100), // paise
        currency: 'INR',
        receipt: booking.bookingCode,
        notes: { bookingId: String(booking._id) },
      }),
    });
    order = await response.json();
  } catch (err) {
    throw httpError(502, 'Could not reach Razorpay. Please try again.');
  }
  if (!response.ok) throw httpError(502, `Razorpay error: ${order?.error?.description || response.status}`);

  booking.razorpayOrderId = order.id;
  await booking.save();
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
});

// POST /api/payments/:bookingId/razorpay/verify  - step 2: verify the signature, then confirm the booking
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  if (!razorpayEnabled()) throw httpError(503, 'Razorpay is not configured on this server');
  const { booking } = await loadPayableBooking(req);
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') {
    throw httpError(400, 'Missing payment details');
  }
  if (booking.razorpayOrderId !== orderId) throw httpError(400, 'This payment does not belong to this booking');

  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    logActivity(req, 'payment_failed', `${booking.bookingCode} bad Razorpay signature`, 'warn');
    throw httpError(400, 'Payment verification failed');
  }
  const payment = await markPaid(req, booking, { method: 'razorpay', transactionId: paymentId });
  res.status(201).json({ payment, booking });
});

// GET /api/payments/my  (logged in)
const getMyPayments = asyncHandler(async (req, res) => {
  res.json(await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }));
});

// GET /api/payments?page=&status=  (admin) - payment tracking
const getAllPayments = asyncHandler(async (req, res) => {
  const filter = {};
  if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;
  const { page, limit, skip } = pageParams(req, 10);
  const [items, total, byStatus] = await Promise.all([
    Payment.find(filter).populate('user', 'name email').populate('booking', 'checkIn checkOut').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
    Payment.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);
  const summary = { success: { total: 0, count: 0 }, failed: { total: 0, count: 0 }, refunded: { total: 0, count: 0 } };
  byStatus.forEach((s) => { if (summary[s._id]) summary[s._id] = { total: s.total, count: s.count }; });
  res.json({ ...pageResult(items, total, page, limit), summary });
});

module.exports = { getConfig, payBooking, createRazorpayOrder, verifyRazorpayPayment, getMyPayments, getAllPayments };
