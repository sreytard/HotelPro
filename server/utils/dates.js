const httpError = require('./httpError');

const DAY = 24 * 60 * 60 * 1000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Today at 00:00 UTC. All stay dates are stored as UTC midnight.
const todayUTC = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

const addDays = (d, n) => new Date(d.getTime() + n * DAY);

// Validates "YYYY-MM-DD" strings and returns { checkIn, checkOut, nights }
const parseStay = (checkInStr, checkOutStr) => {
  if (!ISO.test(checkInStr || '') || !ISO.test(checkOutStr || '')) {
    throw httpError(400, 'Please provide both dates in YYYY-MM-DD format');
  }
  const checkIn = new Date(`${checkInStr}T00:00:00.000Z`);
  const checkOut = new Date(`${checkOutStr}T00:00:00.000Z`);
  if (isNaN(checkIn) || isNaN(checkOut)) throw httpError(400, 'Invalid date');
  if (checkOut <= checkIn) throw httpError(400, 'Check-out must be after check-in');
  if (checkIn < todayUTC()) throw httpError(400, 'Check-in cannot be in the past');
  const nights = Math.round((checkOut - checkIn) / DAY);
  if (nights > 30) throw httpError(400, 'Maximum stay is 30 nights');
  return { checkIn, checkOut, nights };
};

module.exports = { todayUTC, addDays, parseStay, DAY };
