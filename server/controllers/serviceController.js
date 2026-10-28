const ServiceRequest = require('../models/ServiceRequest');
const Booking = require('../models/Booking');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { pageParams, pageResult } = require('../utils/paginate');
const { createNotification, notifyStaff } = require('../utils/notify');
const { notifyChange } = require('../utils/socket');
const { logActivity } = require('../utils/audit');

const TYPES = ['room_service', 'housekeeping', 'maintenance', 'support'];
const STATUSES = ['open', 'in-progress', 'resolved'];
const populate = (q) =>
  q.populate('user', 'name email').populate('room', 'roomNumber').populate('assignedTo', 'name');

// POST /api/requests  (logged in) - service request or support ticket
const createRequest = asyncHandler(async (req, res) => {
  const { type, message } = req.body;
  if (!TYPES.includes(type)) throw httpError(400, 'Choose a request type');
  if (typeof message !== 'string' || message.trim().length < 3) throw httpError(400, 'Please describe what you need');

  // Attach the guest's current stay (if checked in) so staff know which room to visit
  const stay = await Booking.findOne({ user: req.user._id, status: 'checked-in' });
  const request = await ServiceRequest.create({
    user: req.user._id, type, message: message.trim(), booking: stay?._id, room: stay?.room,
  });
  notifyChange('request');
  logActivity(req, 'request_create', type);
  notifyStaff({ title: 'New guest request', message: `${req.user.name}: ${type.replace('_', ' ')}`, type: 'info', link: '/staff/requests' });
  res.status(201).json(await populate(ServiceRequest.findById(request._id)));
});

// GET /api/requests/my  (logged in)
const getMyRequests = asyncHandler(async (req, res) => {
  res.json(await populate(ServiceRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50)));
});

// GET /api/requests?status=&page=  (staff, admin)
const getAllRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const { page, limit, skip } = pageParams(req, 10);
  const [items, total] = await Promise.all([
    populate(ServiceRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    ServiceRequest.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

// PUT /api/requests/:id  { status, assignedTo, staffNote }  (staff, admin) - handle + assign staff
const updateRequest = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id);
  if (!request) throw httpError(404, 'Request not found');
  const { status, assignedTo, staffNote } = req.body;

  const statusChanged = status !== undefined && status !== request.status;
  if (status !== undefined) {
    if (!STATUSES.includes(status)) throw httpError(400, 'Invalid status');
    request.status = status;
    request.resolvedAt = status === 'resolved' ? new Date() : undefined;
  }
  if (assignedTo !== undefined) {
    if (assignedTo === null || assignedTo === '') {
      request.assignedTo = undefined;
    } else {
      const staff = await User.findOne({ _id: assignedTo, role: { $in: ['staff', 'admin'] } });
      if (!staff) throw httpError(400, 'Assign the request to a staff member');
      request.assignedTo = staff._id;
      createNotification(staff._id, { title: 'Request assigned to you', message: request.message.slice(0, 100), type: 'info', link: '/staff/requests' });
    }
  }
  if (staffNote !== undefined) request.staffNote = String(staffNote).slice(0, 300);
  await request.save();

  if (statusChanged) {
    createNotification(request.user, {
      title: 'Request update',
      message: `Your ${request.type.replace('_', ' ')} request is now ${request.status}.`,
      type: request.status === 'resolved' ? 'success' : 'info',
      link: '/services',
    });
  }
  notifyChange('request');
  logActivity(req, 'request_update', `${request.type} -> ${request.status}`);
  res.json(await populate(ServiceRequest.findById(request._id)));
});

// GET /api/requests/staff  (staff, admin) - staff list for the "assign to" dropdown
const getStaffList = asyncHandler(async (req, res) => {
  res.json(await User.find({ role: { $in: ['staff', 'admin'] } }).select('name role').sort({ name: 1 }));
});

module.exports = { createRequest, getMyRequests, getAllRequests, updateRequest, getStaffList };
