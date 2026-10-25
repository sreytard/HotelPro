const Booking = require('../models/Booking');
const { todayUTC } = require('./dates');
const { notifyChange } = require('./socket');

// Unpaid "pending" bookings hold a room only for this long
const PENDING_HOLD_MINUTES = 30;
const ACTIVE = ['pending', 'confirmed', 'checked-in'];

// Cancels pending bookings whose payment window has passed (and tells live clients)
const expireStalePending = async () => {
  const cutoff = new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000);
  const res = await Booking.updateMany({ status: 'pending', createdAt: { $lt: cutoff } }, { status: 'cancelled' });
  if (res.modifiedCount > 0) notifyChange('expired');
  return res.modifiedCount;
};

// Date-overlap rule: existing.checkIn < newCheckOut AND existing.checkOut > newCheckIn
// (so a guest can check in on the same day another guest checks out)
const overlapFilter = (checkIn, checkOut) => ({
  status: { $in: ACTIVE },
  checkIn: { $lt: checkOut },
  checkOut: { $gt: checkIn },
});

// IDs of rooms that are booked during the given stay
const getBookedRoomIds = async (checkIn, checkOut) => {
  await expireStalePending();
  return Booking.find(overlapFilter(checkIn, checkOut)).distinct('room');
};

// true if the room has no overlapping active booking
const isRoomFree = async (roomId, checkIn, checkOut) => {
  await expireStalePending();
  const clashes = await Booking.countDocuments({ room: roomId, ...overlapFilter(checkIn, checkOut) });
  return clashes === 0;
};

// Upcoming booked date ranges of one room (no guest details - safe to show publicly)
const getBookedRanges = async (roomId) => {
  await expireStalePending();
  const rows = await Booking.find({ room: roomId, status: { $in: ACTIVE }, checkOut: { $gt: todayUTC() } })
    .sort({ checkIn: 1 })
    .select('checkIn checkOut')
    .lean();
  return rows.map((r) => ({ checkIn: r.checkIn, checkOut: r.checkOut }));
};

module.exports = { expireStalePending, getBookedRoomIds, isRoomFree, getBookedRanges };
