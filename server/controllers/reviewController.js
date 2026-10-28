const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { pageParams, pageResult } = require('../utils/paginate');
const { notifyChange } = require('../utils/socket');
const { logActivity } = require('../utils/audit');

// Recomputes the room's average rating from all its reviews
const refreshRoomRating = async (roomId) => {
  const [agg] = await Review.aggregate([{ $match: { room: roomId } }, { $group: { _id: '$room', avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await Room.updateOne({ _id: roomId }, { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.n : 0 });
  notifyChange('review', roomId);
};

// POST /api/reviews  { booking, rating, comment }  (guest, after check-out, once per stay)
const createReview = asyncHandler(async (req, res) => {
  const { booking: bookingId, rating, comment } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.user) !== String(req.user._id)) throw httpError(404, 'Booking not found');
  if (booking.status !== 'checked-out') throw httpError(400, 'You can review a room after your stay is completed');
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw httpError(400, 'Rating must be 1 to 5 stars');
  if (await Review.exists({ booking: booking._id })) throw httpError(409, 'You have already reviewed this stay');

  const review = await Review.create({
    room: booking.room, user: req.user._id, booking: booking._id, rating: stars,
    comment: typeof comment === 'string' ? comment : '',
  });
  await refreshRoomRating(booking.room);
  logActivity(req, 'review_create', `${booking.bookingCode} ${stars}*`);
  res.status(201).json(review);
});

// GET /api/reviews/room/:roomId?page=  (public)
const getRoomReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req, 5, 20);
  const filter = { room: req.params.roomId };
  const [items, total] = await Promise.all([
    Review.find(filter).populate('user', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

// GET /api/reviews/latest  (public) - newest written reviews for the home page
const getLatestReviews = asyncHandler(async (req, res) => {
  const items = await Review.find({ comment: { $exists: true, $ne: '' } })
    .populate('user', 'name')
    .populate('room', 'roomNumber type')
    .sort({ createdAt: -1 })
    .limit(6);
  res.json(items);
});

// GET /api/reviews/my  (logged in) - which stays I have already reviewed
const getMyReviews = asyncHandler(async (req, res) => {
  res.json(await Review.find({ user: req.user._id }).select('booking rating'));
});

// DELETE /api/reviews/:id  (admin) - moderation
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw httpError(404, 'Review not found');
  await review.deleteOne();
  await refreshRoomRating(review.room);
  logActivity(req, 'review_delete', String(review._id), 'warn');
  res.json({ message: 'Review deleted' });
});

module.exports = { createReview, getRoomReviews, getLatestReviews, getMyReviews, deleteReview };
