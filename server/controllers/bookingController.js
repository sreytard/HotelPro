const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { parseStay, todayUTC, addDays } = require('../utils/dates');
const { isRoomFree, expireStalePending } = require('../utils/availability');
const { notifyChange } = require('../utils/socket');
const { emailBooking } = require('../utils/mailer');

const isStaff = (user) => ['staff', 'admin'].includes(user.role);
const populateBooking = (q) =>
  q.populate('room', 'roomNumber type pricePerNight images').populate('user', 'name email phone');

const loadBooking = async (id) => {
  const booking = await Booking.findById(id);
  if (!booking) throw httpError(404, 'Booking not found');
  return booking;
};

// POST /api/bookings  (logged in)
// Creates a PENDING booking after validating dates, capacity and date-overlap.
const createBooking = asyncHandler(async (req, res) => {
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

  const booking = await Booking.create({
    user: req.user._id,
    room: room._id,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    guests: g,
    nights: stay.nights,
    totalPrice: stay.nights * room.pricePerNight,
  });
  notifyChange('booking', room._id);
  res.status(201).json(await populateBooking(Booking.findById(booking._id)));
});

// GET /api/bookings/my  (logged in)
const getMyBookings = asyncHandler(async (req, res) => {
  await expireStalePending();
  const bookings = await populateBooking(Booking.find({ user: req.user._id }).sort({ createdAt: -1 }));
  res.json(bookings);
});

// GET /api/bookings?status=confirmed  (staff, admin)
const getAllBookings = asyncHandler(async (req, res) => {
  await expireStalePending();
  const filter = {};
  if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;
  const bookings = await populateBooking(Booking.find(filter).sort({ checkIn: -1 }).limit(300));
  res.json(bookings);
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

// PUT /api/bookings/:id/cancel  (owner, staff, admin)
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id);
  if (!isStaff(req.user) && String(booking.user) !== String(req.user._id)) {
    throw httpError(403, 'You can only cancel your own bookings');
  }
  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw httpError(400, `A ${booking.status} booking cannot be cancelled`);
  }
  if (booking.paymentStatus === 'paid') {
    booking.paymentStatus = 'refunded'; // mock refund
    await Payment.updateMany({ booking: booking._id, status: 'success' }, { status: 'refunded' });
  }
  booking.status = 'cancelled';
  await booking.save();
  notifyChange('booking', booking.room);
  emailBooking('cancelled', booking._id);
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
  await booking.save();
  notifyChange('booking', booking.room);
  emailBooking('checked-in', booking._id);
  res.json(booking);
});

// PUT /api/bookings/:id/check-out  (staff, admin)
const checkOut = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id);
  if (booking.status !== 'checked-in') throw httpError(400, 'Only checked-in bookings can be checked out');
  booking.status = 'checked-out';
  await booking.save();
  notifyChange('booking', booking.room);
  emailBooking('checked-out', booking._id);
  res.json(booking);
});

module.exports = { createBooking, getMyBookings, getAllBookings, getBooking, cancelBooking, checkIn, checkOut };
