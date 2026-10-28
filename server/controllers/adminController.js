const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const ServiceRequest = require('../models/ServiceRequest');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { todayUTC, addDays, DAY } = require('../utils/dates');
const { expireStalePending } = require('../utils/availability');
const { pageParams, pageResult, escapeRegex } = require('../utils/paginate');
const { logActivity } = require('../utils/audit');
const { mailConfigured } = require('../utils/mailer');

const day = (d) => new Date(d).toISOString().slice(0, 10);

// GET /api/admin/stats  (admin) - everything the dashboard needs in one call
const getStats = asyncHandler(async (req, res) => {
  await expireStalePending();
  const today = todayUTC();
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);

  const [
    totalRooms, maintenanceRooms, dirtyRooms, occupiedNow, arrivalsToday, departuresToday, totalGuests,
    cancelRequests, openRequests, statusAgg, revenueAgg, weekPayments, upcoming, recent,
  ] = await Promise.all([
    Room.countDocuments(),
    Room.countDocuments({ status: 'maintenance' }),
    Room.countDocuments({ housekeeping: 'dirty' }),
    Booking.countDocuments({ status: 'checked-in' }),
    Booking.countDocuments({ status: 'confirmed', checkIn: { $gte: today, $lt: tomorrow } }),
    Booking.countDocuments({ status: 'checked-in', checkOut: { $lt: tomorrow } }),
    User.countDocuments({ role: 'guest' }),
    Booking.countDocuments({ cancelRequested: true }),
    ServiceRequest.countDocuments({ status: { $ne: 'resolved' } }),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.find({ status: 'success', createdAt: { $gte: weekStart } }).select('amount createdAt').lean(),
    Booking.find({ status: { $in: ['confirmed', 'checked-in'] }, checkIn: { $lt: addDays(today, 7) }, checkOut: { $gt: today } }).select('checkIn checkOut').lean(),
    Booking.find().sort({ createdAt: -1 }).limit(6).populate('room', 'roomNumber type').populate('user', 'name'),
  ]);

  const sellableRooms = Math.max(totalRooms - maintenanceRooms, 0);
  const occupancyRate = sellableRooms ? Math.round((occupiedNow / sellableRooms) * 100) : 0;

  const bookingsByStatus = { pending: 0, confirmed: 0, 'checked-in': 0, 'checked-out': 0, cancelled: 0 };
  statusAgg.forEach((s) => (bookingsByStatus[s._id] = s.count));

  // Revenue per day for the last 7 days (grouped here so it works on any MongoDB-compatible database)
  const dailyMap = {};
  weekPayments.forEach((p) => { dailyMap[day(p.createdAt)] = (dailyMap[day(p.createdAt)] || 0) + p.amount; });
  const revenueLast7Days = Array.from({ length: 7 }, (_, i) => {
    const date = day(addDays(weekStart, i));
    return { date, total: dailyMap[date] || 0 };
  });

  // Expected occupancy for the next 7 days from confirmed / checked-in stays
  const occupancyForecast = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i);
    const rooms = upcoming.filter((b) => b.checkIn <= d && b.checkOut > d).length;
    return { date: day(d), rooms, rate: sellableRooms ? Math.round((rooms / sellableRooms) * 100) : 0 };
  });

  res.json({
    totalRooms, maintenanceRooms, dirtyRooms, occupiedNow, occupancyRate, arrivalsToday, departuresToday,
    totalGuests, cancelRequests, openRequests,
    totalRevenue: revenueAgg[0]?.total || 0,
    bookingsByStatus, revenueLast7Days, occupancyForecast, recentBookings: recent,
  });
});

// GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD  (admin) - analytics for a date range
const getReports = asyncHandler(async (req, res) => {
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const to = ISO.test(req.query.to || '') ? new Date(`${req.query.to}T00:00:00.000Z`) : todayUTC();
  const from = ISO.test(req.query.from || '') ? new Date(`${req.query.from}T00:00:00.000Z`) : addDays(to, -29);
  if (isNaN(from) || isNaN(to) || to < from) throw httpError(400, 'Choose a valid date range');
  const days = Math.round((to - from) / DAY) + 1;
  if (days > 366) throw httpError(400, 'Choose a range of at most one year');
  const end = addDays(to, 1); // inclusive

  const [payments, bookings, stays, totalRooms, maintenanceRooms] = await Promise.all([
    Payment.find({ status: 'success', createdAt: { $gte: from, $lt: end } }).select('amount createdAt').lean(),
    Booking.find({ createdAt: { $gte: from, $lt: end } }).populate('room', 'type').select('status paymentStatus totalPrice nights createdAt room').lean(),
    Booking.find({ status: { $in: ['confirmed', 'checked-in', 'checked-out'] }, checkIn: { $lt: end }, checkOut: { $gt: from } }).select('checkIn checkOut').lean(),
    Room.countDocuments(),
    Room.countDocuments({ status: 'maintenance' }),
  ]);
  const sellable = Math.max(totalRooms - maintenanceRooms, 0);

  const dates = Array.from({ length: days }, (_, i) => day(addDays(from, i)));
  const revenueMap = {}; const countMap = {};
  payments.forEach((p) => { revenueMap[day(p.createdAt)] = (revenueMap[day(p.createdAt)] || 0) + p.amount; });
  bookings.forEach((b) => { countMap[day(b.createdAt)] = (countMap[day(b.createdAt)] || 0) + 1; });

  const byType = {};
  let cancelled = 0; let nightsTotal = 0; let nightsCount = 0;
  bookings.forEach((b) => {
    const t = b.room?.type || 'removed';
    byType[t] = byType[t] || { type: t, bookings: 0, revenue: 0 };
    byType[t].bookings += 1;
    if (b.paymentStatus === 'paid') byType[t].revenue += b.totalPrice;
    if (b.status === 'cancelled') cancelled += 1;
    nightsTotal += b.nights; nightsCount += 1;
  });

  res.json({
    from: day(from), to: day(to),
    totals: {
      revenue: payments.reduce((s, p) => s + p.amount, 0),
      bookings: bookings.length,
      cancelRate: bookings.length ? Math.round((cancelled / bookings.length) * 100) : 0,
      avgNights: nightsCount ? Math.round((nightsTotal / nightsCount) * 10) / 10 : 0,
    },
    revenueByDay: dates.map((date) => ({ date, total: revenueMap[date] || 0 })),
    bookingsByDay: dates.map((date) => ({ date, count: countMap[date] || 0 })),
    occupancyByDay: dates.map((date) => {
      const d = new Date(`${date}T00:00:00.000Z`);
      const rooms = stays.filter((s) => s.checkIn <= d && s.checkOut > d).length;
      return { date, rooms, rate: sellable ? Math.round((rooms / sellable) * 100) : 0 };
    }),
    byRoomType: Object.values(byType),
  });
});

// GET /api/admin/reports/export?from=&to=  (admin) - bookings as a CSV download
const exportReport = asyncHandler(async (req, res) => {
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const to = ISO.test(req.query.to || '') ? new Date(`${req.query.to}T00:00:00.000Z`) : todayUTC();
  const from = ISO.test(req.query.from || '') ? new Date(`${req.query.from}T00:00:00.000Z`) : addDays(to, -29);
  if (isNaN(from) || isNaN(to) || to < from) throw httpError(400, 'Choose a valid date range');

  const bookings = await Booking.find({ createdAt: { $gte: from, $lt: addDays(to, 1) } })
    .populate('user', 'name email').populate('room', 'roomNumber type').sort({ createdAt: 1 }).limit(5000);

  // Spreadsheet-safe cell: quotes escaped, and leading = + - @ neutralised (CSV injection)
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = [['Booking ID', 'Created', 'Guest', 'Email', 'Room', 'Type', 'Check-in', 'Check-out', 'Nights', 'Total (INR)', 'Status', 'Payment']];
  bookings.forEach((b) => rows.push([
    b.bookingCode, day(b.createdAt), b.user?.name, b.user?.email, b.room?.roomNumber, b.room?.type,
    day(b.checkIn), day(b.checkOut), b.nights, b.totalPrice, b.status, b.paymentStatus,
  ]));
  logActivity(req, 'report_export', `${day(from)} to ${day(to)}`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="hotelpro-bookings-${day(from)}-to-${day(to)}.csv"`);
  res.send(rows.map((r) => r.map(cell).join(',')).join('\n'));
});

// GET /api/admin/users?page=&role=&q=  (admin)
const getUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (['guest', 'staff', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const { page, limit, skip } = pageParams(req, 10);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

// POST /api/admin/users  (admin) - create a staff (or admin) account
const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role = 'staff' } = req.body;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw httpError(400, 'Name, email and password are required');
  }
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
  if (!['staff', 'admin'].includes(role)) throw httpError(400, 'Role must be staff or admin');
  const user = await User.create({ name, email, password, phone, role });
  logActivity(req, 'user_create', `${user.email} (${role})`, 'warn');
  res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
});

// DELETE /api/admin/users/:id  (admin) - cannot delete yourself
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw httpError(400, 'You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  await user.deleteOne();
  logActivity(req, 'user_delete', `${user.email} (${user.role})`, 'warn');
  res.json({ message: 'User deleted' });
});

// GET /api/admin/audit?page=&level=&q=  (admin) - activity log and security monitoring
const getAuditLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (['info', 'warn', 'error'].includes(req.query.level)) filter.level = req.query.level;
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    filter.$or = [{ action: rx }, { userName: rx }, { details: rx }];
  }
  const { page, limit, skip } = pageParams(req, 15);
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

// GET /api/admin/health  (admin) - system health monitoring
const getHealth = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [users, rooms, bookings, errors24h, failedLogins24h] = await Promise.all([
    User.countDocuments(), Room.countDocuments(), Booking.countDocuments(),
    AuditLog.countDocuments({ level: 'error', createdAt: { $gte: since } }),
    AuditLog.countDocuments({ action: 'login_failed', createdAt: { $gte: since } }),
  ]);
  res.json({
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptimeMinutes: Math.round(process.uptime() / 60),
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node: process.version,
    counts: { users, rooms, bookings },
    errors24h, failedLogins24h,
    services: {
      email: mailConfigured(),
      photos: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    },
  });
});

module.exports = { getStats, getReports, exportReport, getUsers, createStaff, deleteUser, getAuditLogs, getHealth };
