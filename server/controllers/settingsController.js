const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const pick = require('../utils/pick');
const { getSettings } = require('../utils/settings');
const { logActivity } = require('../utils/audit');

const FIELDS = ['hotelName', 'address', 'phone', 'email', 'taxPercent', 'checkInTime', 'checkOutTime', 'heroImages'];

// GET /api/settings  (public) - hotel details shown on the site and invoices
const getHotelSettings = asyncHandler(async (req, res) => {
  res.json(await getSettings());
});

// PUT /api/settings  (admin) - platform configuration
const updateHotelSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const data = pick(req.body, FIELDS);
  if (data.taxPercent !== undefined) {
    data.taxPercent = Number(data.taxPercent);
    if (isNaN(data.taxPercent) || data.taxPercent < 0 || data.taxPercent > 50) throw httpError(400, 'Tax must be between 0 and 50');
  }
  if (data.heroImages !== undefined) {
    const list = Array.isArray(data.heroImages) ? data.heroImages : [];
    if (list.length > 8 || list.some((u) => typeof u !== 'string' || !/^https?:\/\//i.test(u) || u.length > 500)) {
      throw httpError(400, 'Add up to 8 photos, each a valid http(s) link');
    }
    data.heroImages = list;
  }
  Object.assign(settings, data);
  await settings.save();
  logActivity(req, 'settings_update', 'Hotel settings changed', 'warn');
  res.json(settings);
});

module.exports = { getHotelSettings, updateHotelSettings };
