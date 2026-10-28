const Setting = require('../models/Setting');

// Returns the single settings document (created with defaults on first use)
const getSettings = async () => (await Setting.findOne()) || (await Setting.create({}));

module.exports = { getSettings };
