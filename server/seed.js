// Run with:  npm run seed   (wipes the DB and inserts demo data)
require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Room = require('./models/Room');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');
const Review = require('./models/Review');
const Notification = require('./models/Notification');
const ServiceRequest = require('./models/ServiceRequest');
const SeasonalPrice = require('./models/SeasonalPrice');
const Setting = require('./models/Setting');
const AuditLog = require('./models/AuditLog');
const { todayUTC, addDays } = require('./utils/dates');

// Passwords come from environment variables so real admin/staff passwords never live in the code.
// Without them (local database only) the demo defaults below are used.
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const STAFF_PW = process.env.SEED_STAFF_PASSWORD || 'Staff@123';
const GUEST_PW = process.env.SEED_GUEST_PASSWORD || 'Guest@123';

// Safety: never seed an online (Atlas) database with the public default passwords
const usingAtlas = /^mongodb\+srv:/i.test(process.env.MONGO_URI || '');
if (usingAtlas && (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_STAFF_PASSWORD)) {
  console.error('Refusing to seed an online database with the default passwords.\n' +
    'Set SEED_ADMIN_PASSWORD and SEED_STAFF_PASSWORD first (at least 8 characters), then run the seed again.');
  process.exit(1);
}
for (const [name, value] of [['SEED_ADMIN_PASSWORD', process.env.SEED_ADMIN_PASSWORD], ['SEED_STAFF_PASSWORD', process.env.SEED_STAFF_PASSWORD]]) {
  if (value && value.length < 8) {
    console.error(`${name} must be at least 8 characters.`);
    process.exit(1);
  }
}

const img = (n) => `https://picsum.photos/seed/hotelpro${n}/800/500`;

const rooms = [
  { roomNumber: '101', type: 'single', pricePerNight: 2499, capacity: 1, amenities: ['Wi-Fi', 'AC', 'TV', 'Work desk'], description: 'Compact, quiet room for solo travellers with a comfortable work desk.' },
  { roomNumber: '102', type: 'single', pricePerNight: 2499, capacity: 1, amenities: ['Wi-Fi', 'AC', 'TV'], description: 'Cosy single room on the first floor with garden view.' },
  { roomNumber: '201', type: 'double', pricePerNight: 3999, capacity: 2, amenities: ['Wi-Fi', 'AC', 'TV', 'Mini fridge'], description: 'Spacious double room with a queen bed and city view.' },
  { roomNumber: '202', type: 'double', pricePerNight: 4299, capacity: 3, amenities: ['Wi-Fi', 'AC', 'TV', 'Mini fridge', 'Sofa bed'], description: 'Family-friendly double with an extra sofa bed.' },
  { roomNumber: '203', type: 'double', pricePerNight: 3999, capacity: 2, amenities: ['Wi-Fi', 'AC', 'TV'], description: 'Bright double room with a private balcony.', housekeeping: 'dirty' },
  { roomNumber: '301', type: 'deluxe', pricePerNight: 5999, capacity: 3, amenities: ['Wi-Fi', 'AC', 'Smart TV', 'Bathtub', 'Breakfast'], description: 'Deluxe room with a bathtub, lounge corner and complimentary breakfast.' },
  { roomNumber: '302', type: 'deluxe', pricePerNight: 5999, capacity: 3, amenities: ['Wi-Fi', 'AC', 'Smart TV', 'Bathtub', 'Breakfast'], description: 'Top-floor deluxe room with skyline views.', status: 'maintenance' },
  { roomNumber: '401', type: 'suite', pricePerNight: 9999, capacity: 4, amenities: ['Wi-Fi', 'AC', 'Smart TV', 'Jacuzzi', 'Breakfast', 'Lounge access'], description: 'Two-room presidential suite with a living area and jacuzzi.' },
].map((r) => ({ ...r, images: [img(r.roomNumber)] }));

const run = async () => {
  await connectDB();
  await Promise.all([
    User.deleteMany(), Room.deleteMany(), Booking.deleteMany(), Payment.deleteMany(), Review.deleteMany(),
    Notification.deleteMany(), ServiceRequest.deleteMany(), SeasonalPrice.deleteMany(), Setting.deleteMany(), AuditLog.deleteMany(),
  ]);

  const admin = await User.create({ name: 'Admin User', email: 'admin@hotelpro.com', password: ADMIN_PW, role: 'admin' });
  const staff = await User.create({ name: 'Front Desk', email: 'staff@hotelpro.com', password: STAFF_PW, role: 'staff' });
  const guest = await User.create({ name: 'Demo Guest', email: 'guest@hotelpro.com', password: GUEST_PW, phone: '9876543210' });

  await Setting.create({});

  const created = await Room.insertMany(rooms);
  const byNo = Object.fromEntries(created.map((r) => [r.roomNumber, r]));
  const today = todayUTC();

  // [room, startOffset, endOffset, status, paidDaysAgo]
  const samples = [
    ['101', -1, 2, 'checked-in', 1],
    ['201', 0, 3, 'confirmed', 0],
    ['301', 3, 5, 'confirmed', 0],
    ['102', -6, -3, 'checked-out', 6],
    ['203', -4, -2, 'checked-out', 4],
    ['401', -8, -5, 'checked-out', 5],
  ];

  const made = {};
  for (const [no, s, e, status, paidDaysAgo] of samples) {
    const room = byNo[no];
    const nights = e - s;
    const total = nights * room.pricePerNight;
    const booking = await Booking.create({
      user: guest._id, room: room._id, checkIn: addDays(today, s), checkOut: addDays(today, e),
      guests: 1, nights, totalPrice: total, status, paymentStatus: 'paid', amountPaid: total,
    });
    await Payment.create({
      booking: booking._id, user: guest._id, amount: total, method: 'card', last4: '4242',
      status: 'success', transactionId: `TXN-SEED-${no}`, createdAt: addDays(new Date(), -paidDaysAgo),
    });
    made[no] = booking;
  }

  // Reviews for finished stays (room ratings are kept on the room)
  const reviews = [
    ['102', 5, 'Quiet, spotless and the garden view was lovely. Check-in took two minutes.'],
    ['203', 4, 'Great balcony and comfortable bed. AC was a little noisy at night.'],
    ['401', 5, 'The suite is superb. Jacuzzi and the lounge were the highlight of our trip.'],
  ];
  for (const [no, rating, comment] of reviews) {
    await Review.create({ room: byNo[no]._id, user: guest._id, booking: made[no]._id, rating, comment });
    await Room.updateOne({ _id: byNo[no]._id }, { ratingAvg: rating, ratingCount: 1 });
  }

  // A festival-season price rule starting in two weeks
  await SeasonalPrice.create({ name: 'Festival season', startDate: addDays(today, 14), endDate: addDays(today, 24), percent: 25, roomType: 'all' });

  // A guest service request from the checked-in guest, and a few notifications
  await ServiceRequest.create({ user: guest._id, booking: made['101']._id, room: byNo['101']._id, type: 'housekeeping', message: 'Please bring two extra towels.', status: 'open' });
  await Notification.insertMany([
    { user: guest._id, title: 'Welcome!', message: 'You are checked in to Room 101.', type: 'success', link: '/services' },
    { user: guest._id, title: 'Payment received', message: 'Your booking for Room 201 is confirmed.', type: 'success', link: '/my-bookings' },
    { user: staff._id, title: 'New guest request', message: 'Demo Guest: housekeeping', type: 'info', link: '/staff/requests' },
  ]);

  console.log('Seed complete.');
  console.log('  admin@hotelpro.com  (password: ' + (process.env.SEED_ADMIN_PASSWORD ? 'the one you set' : 'default, local only') + ')');
  console.log('  staff@hotelpro.com  (password: ' + (process.env.SEED_STAFF_PASSWORD ? 'the one you set' : 'default, local only') + ')');
  console.log('  guest@hotelpro.com  (public demo guest)');
  void admin;
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
