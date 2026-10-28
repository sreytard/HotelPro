const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const pick = require('../utils/pick');
const { parseStay, todayUTC } = require('../utils/dates');
const { getBookedRoomIds, isRoomFree, getBookedRanges } = require('../utils/availability');
const { quote } = require('../utils/pricing');
const { notifyChange } = require('../utils/socket');
const { logActivity } = require('../utils/audit');

const FIELDS = ['roomNumber', 'type', 'pricePerNight', 'capacity', 'description', 'amenities', 'images', 'status'];

// GET /api/rooms  (public)
// Optional filters: type, maxPrice, guests, checkIn+checkOut (real-time availability), all=true
const getRooms = asyncHandler(async (req, res) => {
  const { type, maxPrice, guests, checkIn, checkOut, all } = req.query;
  const query = {};

  if (all !== 'true') query.status = 'available'; // hide maintenance rooms from guests
  if (typeof type === 'string' && type) query.type = type;
  if (maxPrice && !isNaN(Number(maxPrice))) query.pricePerNight = { $lte: Number(maxPrice) };
  if (guests && !isNaN(Number(guests))) query.capacity = { $gte: Number(guests) };

  // Availability search: exclude rooms that have an overlapping booking
  if (checkIn || checkOut) {
    const stay = parseStay(checkIn, checkOut);
    const booked = await getBookedRoomIds(stay.checkIn, stay.checkOut);
    query._id = { $nin: booked };
  }

  const rooms = await Room.find(query).sort({ roomNumber: 1 });
  res.json(rooms);
});

// GET /api/rooms/:id  (public)
const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw httpError(404, 'Room not found');
  res.json(room);
});

// GET /api/rooms/:id/availability?checkIn=&checkOut=  (public)
// Returns the room's upcoming booked date ranges and, if dates are given, whether they are free + the price quote.
const getAvailability = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw httpError(404, 'Room not found');

  const bookedRanges = await getBookedRanges(room._id);
  let available = null;
  let priceQuote = null;
  const { checkIn, checkOut } = req.query;
  if (checkIn && checkOut) {
    const stay = parseStay(checkIn, checkOut);
    available = room.status === 'available' && (await isRoomFree(room._id, stay.checkIn, stay.checkOut));
    priceQuote = await quote(room, stay.checkIn, stay.checkOut);
  }
  res.json({ available, bookedRanges, quote: priceQuote });
});

// ---------------------------------------------------------------------------
// Image upload (staff, admin)
//   Cloudinary keys in .env -> images go to Cloudinary (permanent, use this when deployed)
//   no keys                 -> images are saved in server/uploads (fine for local use only)
// ---------------------------------------------------------------------------
const cloudinaryReady = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Checks the real file signature, not just the name/type the browser claims
const detectType = (buf) => {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
};

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'hotelpro/rooms', resource_type: 'image', transformation: [{ width: 1600, crop: 'limit', quality: 'auto' }] },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });

const saveLocally = (buffer, ext, req) => {
  const dir = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buffer);
  return `${req.protocol}://${req.get('host')}/uploads/${name}`;
};

// POST /api/rooms/upload  (multipart field "images")
const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw httpError(400, 'Choose at least one image');
  const urls = [];
  for (const file of req.files) {
    const ext = detectType(file.buffer);
    if (!ext) throw httpError(400, `${file.originalname} is not a valid JPG, PNG or WebP image`);
    try {
      urls.push(cloudinaryReady() ? await uploadToCloudinary(file.buffer) : saveLocally(file.buffer, ext, req));
    } catch (err) {
      throw httpError(502, `Image upload failed: ${err.message}`);
    }
  }
  res.status(201).json({ urls, storage: cloudinaryReady() ? 'cloudinary' : 'local' });
});

// POST /api/rooms  (staff, admin)
const createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create(pick(req.body, FIELDS));
  notifyChange('room', room._id);
  logActivity(req, 'room_create', `Room ${room.roomNumber}`);
  res.status(201).json(room);
});

// PUT /api/rooms/:id  (staff, admin)
const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw httpError(404, 'Room not found');
  Object.assign(room, pick(req.body, FIELDS));
  await room.save();
  notifyChange('room', room._id);
  logActivity(req, 'room_update', `Room ${room.roomNumber}`);
  res.json(room);
});

// PUT /api/rooms/:id/housekeeping  { status }  (staff, admin)
const updateHousekeeping = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['clean', 'dirty', 'cleaning'].includes(status)) throw httpError(400, 'Status must be clean, dirty or cleaning');
  const room = await Room.findById(req.params.id);
  if (!room) throw httpError(404, 'Room not found');
  room.housekeeping = status;
  await room.save();
  notifyChange('room', room._id);
  logActivity(req, 'housekeeping', `Room ${room.roomNumber} -> ${status}`);
  res.json(room);
});

// DELETE /api/rooms/:id  (admin) - blocked while the room has live bookings
const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw httpError(404, 'Room not found');
  const live = await Booking.exists({
    room: room._id,
    status: { $in: ['pending', 'confirmed', 'checked-in'] },
    checkOut: { $gt: todayUTC() },
  });
  if (live) throw httpError(400, 'Room has active or upcoming bookings and cannot be deleted');
  await room.deleteOne();
  notifyChange('room', room._id);
  logActivity(req, 'room_delete', `Room ${room.roomNumber}`, 'warn');
  res.json({ message: 'Room deleted' });
});

module.exports = { getRooms, getRoom, getAvailability, uploadImages, createRoom, updateRoom, updateHousekeeping, deleteRoom };
