const SeasonalPrice = require('../models/SeasonalPrice');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { logActivity } = require('../utils/audit');
const { notifyChange } = require('../utils/socket');

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const toDate = (s) => {
  if (!ISO.test(s || '')) throw httpError(400, 'Dates must be in YYYY-MM-DD format');
  const d = new Date(`${s}T00:00:00.000Z`);
  if (isNaN(d)) throw httpError(400, 'Invalid date');
  return d;
};

// Validates and converts the request body into a SeasonalPrice document shape
const parseBody = (body) => {
  const startDate = toDate(body.startDate);
  const endDate = toDate(body.endDate);
  if (endDate < startDate) throw httpError(400, 'End date must be on or after the start date');
  const percent = Number(body.percent);
  if (isNaN(percent)) throw httpError(400, 'Percent must be a number (e.g. 25 or -10)');
  return {
    name: body.name, startDate, endDate, percent,
    roomType: body.roomType || 'all',
    active: body.active === undefined ? true : Boolean(body.active),
  };
};

// GET /api/seasons  (admin)
const getSeasons = asyncHandler(async (req, res) => {
  res.json(await SeasonalPrice.find().sort({ startDate: -1 }));
});

// POST /api/seasons  (admin)
const createSeason = asyncHandler(async (req, res) => {
  const season = await SeasonalPrice.create(parseBody(req.body));
  notifyChange('pricing');
  logActivity(req, 'season_create', `${season.name} ${season.percent}%`);
  res.status(201).json(season);
});

// PUT /api/seasons/:id  (admin)
const updateSeason = asyncHandler(async (req, res) => {
  const season = await SeasonalPrice.findById(req.params.id);
  if (!season) throw httpError(404, 'Pricing rule not found');
  Object.assign(season, parseBody({ ...season.toObject(), startDate: season.startDate.toISOString().slice(0, 10), endDate: season.endDate.toISOString().slice(0, 10), ...req.body }));
  await season.save();
  notifyChange('pricing');
  logActivity(req, 'season_update', season.name);
  res.json(season);
});

// DELETE /api/seasons/:id  (admin)
const deleteSeason = asyncHandler(async (req, res) => {
  const season = await SeasonalPrice.findById(req.params.id);
  if (!season) throw httpError(404, 'Pricing rule not found');
  await season.deleteOne();
  notifyChange('pricing');
  logActivity(req, 'season_delete', season.name, 'warn');
  res.json({ message: 'Pricing rule deleted' });
});

module.exports = { getSeasons, createSeason, updateSeason, deleteSeason };
