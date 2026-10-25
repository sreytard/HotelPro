const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { todayUTC, addDays } = require('../utils/dates');
const { expireStalePending } = require('../utils/availability');

// GET /api/admin/stats  (admin) - everything the dashboard needs in one call
const getStats = asyncHandler(async (req, res) => {
  await expireStalePending();
  const today = todayUTC();
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);

  const [totalRooms, maintenanceRooms, occupiedNow, arrivalsToday, departuresToday, totalGuests, statusAgg, revenueAgg, dailyAgg, recent] =
    await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'maintenance' }),
      Booking.countDocuments({ status: 'checked-in' }),
      Booking.countDocuments({ status: 'confirmed', checkIn: { $gte: today, $lt: tomorrow } }),
      Booking.countDocuments({ status: 'checked-in', checkOut: { $lt: tomorrow } }),
      User.countDocuments({ role: 'guest' }),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([
        { $match: { status: 'success', createdAt: { $gte: weekStart } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$amount' } } },
      ]),
      Booking.find().sort({ createdAt: -1 }).limit(6).populate('room', 'roomNumber type').populate('user', 'name'),
    ]);

  const sellableRooms = Math.max(totalRooms - maintenanceRooms, 0);
  const occupancyRate = sellableRooms ? Math.round((occupiedNow / sellableRooms) * 100) : 0;

  const bookingsByStatus = { pending: 0, confirmed: 0, 'checked-in': 0, 'checked-out': 0, cancelled: 0 };
  statusAgg.forEach((s) => (bookingsByStatus[s._id] = s.count));

  // Fill days without revenue with 0 so the chart always shows 7 bars
  const dailyMap = Object.fromEntries(dailyAgg.map((d) => [d._id, d.total]));
  const revenueLast7Days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i).toISOString().slice(0, 10);
    return { date, total: dailyMap[date] || 0 };
  });

  res.json({
    totalRooms,
    maintenanceRooms,
    occupiedNow,
    occupancyRate,
    arrivalsToday,
    departuresToday,
    totalGuests,
    totalRevenue: revenueAgg[0]?.total || 0,
    bookingsByStatus,
    revenueLast7Days,
    recentBookings: recent,
  });
});

// GET /api/admin/users  (admin)
const getUsers = asyncHandler(async (req, res) => {
  res.json(await User.find().sort({ createdAt: -1 }));
});

// POST /api/admin/users  (admin) - create a staff (or admin) account
const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role = 'staff' } = req.body;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw httpError(400, 'Name, email and password are required');
  }
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (!['staff', 'admin'].includes(role)) throw httpError(400, 'Role must be staff or admin');
  const user = await User.create({ name, email, password, phone, role });
  res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
});

// DELETE /api/admin/users/:id  (admin) - cannot delete yourself
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw httpError(400, 'You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  await user.deleteOne();
  res.json({ message: 'User deleted' });
});

module.exports = { getStats, getUsers, createStaff, deleteUser };
