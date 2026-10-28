const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { parseStay, todayUTC, addDays } = require('../utils/dates');
const { isRoomFree, expireStalePending } = require('../utils/availability');
const { quote } = require('../utils/pricing');
const { notifyChange } = require('../utils/socket');
const { emailBooking } = require('../utils/mailer');
const { createNotification, notifyStaff } = require('../utils/notify');
const { logActivity } = require('../utils/audit');
const { pageParams, pageResult } = require('../utils/paginate');
const { getSettings } = require('../utils/settings');

const isStaff = (user) => ['staff', 'admin'].includes(user.role);
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const populateBooking = (q) =>
  q.populate('room', 'roomNumber type pricePerNight images').populate('user', 'name email phone');

const loadBooking = async (id) => {
  const booking = await Booking.findById(id);
  if (!booking) throw httpError(404, 'Booking not found');
  return booking;
};

// POST /api/bookings  (logged in)
// Creates a PENDING booking after validating dates, capacity and date-overlap. Price includes seasonal rules.
const createBooking = asyncHandler(async (req, res) => {
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && req.user.emailVerified === false) {
    throw httpError(403, 'Please verify your email before booking. Check your inbox for the link.');
  }
  const { room: roomId, checkIn, checkOut, guests = 1 } = req.body;
  const stay = parseStay(checkIn, checkOut);

  const room = await Room.findById(roomId);
  if (!room) throw httpError(404, 'Room not found');
  if (room.status !== 'available') throw httpError(400, 'This room is under maintenance');

  const g = Number(guests);
  if (!Number.isInteger(g) || g < 1) throw httpError(400, 'Guests must be a whole number');
  if (g > room.capacity) throw httpError(400, `This room fits at most ${room.capacity} guest(s)`);

  // Date-overlap validation
  if (!(await isRoomFree(room._id, stay.checkIn, stay.checkOut))) {
    throw httpError(409, 'Room is not available for the selected dates');
  }

  const priceQuote = await quote(room, stay.checkIn, stay.checkOut);
  const booking = await Booking.create({
    user: req.user._id,
    room: room._id,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    guests: g,
    nights: priceQuote.nights,
    totalPrice: priceQuote.total,
  });
  notifyChange('booking', room._id);
  logActivity(req, 'booking_create', `${booking.bookingCode} Room ${room.roomNumber}`);
  createNotification(req.user._id, {
    title: 'Booking created',
    message: `${booking.bookingCode}: pay within 30 minutes to confirm Room ${room.roomNumber}.`,
    type: 'warning',
    link: `/pay/${booking._id}`,
  });
  res.status(201).json(await populateBooking(Booking.findById(booking._id)));
});

// GET /api/bookings/my  (logged in)
const getMyBookings = asyncHandler(async (req, res) => {
  await expireStalePending();
  const bookings = await populateBooking(Booking.find({ user: req.user._id }).sort({ createdAt: -1 }));
  res.json(bookings);
});

// GET /api/bookings?status=confirmed&page=1  (staff, admin) - paginated
// status "cancel-requested" lists paid bookings where the guest asked to cancel
const getAllBookings = asyncHandler(async (req, res) => {
  await expireStalePending();
  const filter = {};
  const { status } = req.query;
  if (status === 'cancel-requested') filter.cancelRequested = true;
  else if (typeof status === 'string' && status) filter.status = status;

  const { page, limit, skip } = pageParams(req, 10);
  const [items, total] = await Promise.all([
    populateBooking(Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Booking.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

// GET /api/bookings/:id  (owner, staff, admin)
const getBooking = asyncHandler(async (req, res) => {
  await expireStalePending();
  const booking = await populateBooking(Booking.findById(req.params.id));
  if (!booking) throw httpError(404, 'Booking not found');
  if (!isStaff(req.user) && String(booking.user._id) !== String(req.user._id)) {
    throw httpError(403, 'You do not have permission to view this booking');
  }
  res.json(booking);
});

// GET /api/bookings/:id/invoice  (owner, staff, admin) - everything needed to print an invoice
const getInvoice = asyncHandler(async (req, res) => {
  const booking = await populateBooking(Booking.findById(req.params.id));
  if (!booking) throw httpError(404, 'Booking not found');
  if (!isStaff(req.user) && String(booking.user._id) !== String(req.user._id)) {
    throw httpError(403, 'You do not have permission to view this invoice');
  }
  if (booking.paymentStatus === 'unpaid') throw httpError(400, 'The invoice is available after payment');

  const [settings, payments] = await Promise.all([
    getSettings(),
    Payment.find({ booking: booking._id }).sort({ createdAt: 1 }),
  ]);
  // Room prices include GST: split the total into taxable amount and tax
  const total = booking.totalPrice;
  const subtotal = Math.round((total / (1 + settings.taxPercent / 100)) * 100) / 100;
  const taxAmount = Math.round((total - subtotal) * 100) / 100;
  const paid = booking.paymentStatus === 'paid' ? (booking.amountPaid ?? total) : 0;
  res.json({
    invoiceNumber: `INV-${booking.bookingCode}`,
    booking,
    settings,
    payments,
    subtotal,
    taxAmount,
    total,
    paid,
    balance: booking.paymentStatus === 'paid' ? total - paid : 0, // >0 due at desk, <0 to refund
  });
});

// PUT /api/bookings/:id  { checkIn, checkOut, guests }  (owner while pending; staff/admin while pending or confirmed)
const modifyBooking = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id);
  const staff = isStaff(req.user);
  if (!staff && String(booking.user) !== String(req.user._id)) throw httpError(403, 'You can only change your own bookings');
  if (!['pending', 'confirmed'].includes(booking.status)) throw httpError(400, `A ${booking.status} booking cannot be changed`);
  if (booking.status === 'confirmed' && !staff) {
    throw httpError(400, 'A paid booking can only be changed by the front desk. Please contact the hotel.');
  }

  const stay = parseStay(req.body.checkIn || iso(booking.checkIn), req.body.checkOut || iso(booking.checkOut));
  const room = await Room.findById(booking.room);
  if (!room) throw httpError(404, 'Room no longer exists');
  const g = req.body.guests === undefined ? booking.guests : Number(req.body.guests);
  if (!Number.isInteger(g) || g < 1 || g > room.capacity) throw httpError(400, `Guests must be between 1 and ${room.capacity}`);

  if (!(await isRoomFree(booking.room, stay.checkIn, stay.checkOut, booking._id))) {
    throw httpError(409, 'Room is not available for the new dates');
  }
  const priceQuote = await quote(room, stay.checkIn, stay.checkOut);
  booking.checkIn = stay.checkIn;
  booking.checkOut = stay.checkOut;
  booking.nights = priceQuote.nights;
  booking.totalPrice = priceQuote.total;
  booking.guests = g;
  await booking.save();

  notifyChange('booking', booking.room);
  logActivity(req, 'booking_modify', `${booking.bookingCode} -> ${iso(stay.checkIn)} to ${iso(stay.checkOut)}`);
  createNotification(booking.user, {
    title: 'Booking updated',
    message: `${booking.bookingCode} now runs ${iso(stay.checkIn)} to ${iso(stay.checkOut)}.`,
    type: 'info',
    link: '/my-bookings',
  });
  res.json(await populateBooking(Booking.findById(booking._id)));
});

// PUT /api/bookings/:id/cancel  { reason }  (owner, staff, admin)
//  - unpaid booking, or staff/admin: cancelled immediately (paid bookings are refunded)
//  - guest cancelling a PAID booking: creates a cancellation request that staff approve or reject
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id);
  const staff = isStaff(req.user);
  if (!staff && String(booking.user) !== String(req.user._id)) {
    throw httpError(403, 'You can only cancel your own bookings');
  }
  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw httpError(400, `A ${booking.status} booking cannot be cancelled`);
  }

  const paid = booking.paymentStatus === 'paid';
  if (!staff && paid) {
    if (booking.cancelRequested) throw httpError(400, 'You have already requested cancellation');
    booking.cancelRequested = true;
    booking.cancelReason = String(req.body?.reason || '').slice(0, 300);
    await booking.save();
    notifyChange('booking', booking.room);
    logActivity(req, 'cancel_request', booking.bookingCode);
    notifyStaff({ title: 'Cancellation request', message: `${booking.bookingCode} (${req.user.name}) asks to cancel and be refunded.`, type: 'warning', link: '/staff/bookings' });
    createNotification(booking.user, { title: 'Cancellation requested', message: `${booking.bookingCode}: the hotel will review your request.`, type: 'info', link: '/my-bookings' });
    return res.json({ booking, requested: true });
  }

  if (paid) {
    booking.paymentStatus = 'refunded'; // mock refund
    await Payment.updateMany({ booking: booking._id, status: 'success' }, { status: 'refunded' });
  }
  booking.status = 'cancelled';
  booking.cancelRequested = false;
  await booking.save();
  notifyChange('booking', booking.room);
  emailBooking('cancelled', booking._id);
  logActivity(req, 'booking_cancel', `${booking.bookingCode}${paid ? ' (refunded)' : ''}`, 'warn');
  createNotification(booking.user, {
    title: 'Booking cancelled',
    message: `${booking.bookingCode} was cancelled${paid ? ' and your payment will be refunded' : ''}.`,
    type: 'info',
    link: '/my-bookings',
  });
  res.json({ booking, requested: false });
});

// PUT /api/bookings/:id/reject-cancel  (staff, admin) - keeps the booking
const rejectCancel = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id);
  if (!booking.cancelRequested) throw httpError(400, 'There is no cancellation request on this booking');
  booking.cancelRequested = false;
  await booking.save();
  notifyChange('booking', booking.room);
  logActivity(req, 'cancel_rejected', booking.bookingCode);
  createNotification(booking.user, { title: 'Cancellation not approved', message: `${booking.bookingCode} stays confirmed. Contact the hotel for details.`, type: 'warning', link: '/my-bookings' });
  res.json(booking);
});

// PUT /api/bookings/:id/check-in  (staff, admin) - only paid/confirmed bookings
const checkIn = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id);
  if (booking.status !== 'confirmed') {
    throw httpError(400, 'Only confirmed (paid) bookings can be checked in');
  }
  // small tolerance (1 day) so timezones never block a same-day arrival
  if (booking.checkIn > addDays(todayUTC(), 1)) throw httpError(400, 'Too early - guest arrives on a later date');
  booking.status = 'checked-in';
  booking.cancelRequested = false;
  await booking.save();
  const room = await Room.findById(booking.room).select('roomNumber');
  notifyChange('booking', booking.room);
  emailBooking('checked-in', booking._id);
  logActivity(req, 'check_in', booking.bookingCode);
  createNotification(booking.user, { title: 'Welcome!', message: `You are checked in to Room ${room?.roomNumber}.`, type: 'success', link: '/services' });
  res.json(booking);
});

// PUT /api/bookings/:id/check-out  (staff, admin) - the room becomes "dirty" for housekeeping
const checkOut = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id);
  if (booking.status !== 'checked-in') throw httpError(400, 'Only checked-in bookings can be checked out');
  booking.status = 'checked-out';
  await booking.save();
  await Room.updateOne({ _id: booking.room }, { housekeeping: 'dirty' });
  notifyChange('booking', booking.room);
  emailBooking('checked-out', booking._id);
  logActivity(req, 'check_out', booking.bookingCode);
  createNotification(booking.user, { title: 'Thank you for staying!', message: 'How was your stay? Leave a review from My bookings.', type: 'success', link: '/my-bookings' });
  res.json(booking);
});

module.exports = {
  createBooking, getMyBookings, getAllBookings, getBooking, getInvoice,
  modifyBooking, cancelBooking, rejectCancel, checkIn, checkOut,
};
