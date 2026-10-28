const mongoose = require('mongoose');

// Seasonal pricing rule: +25 means 25% more expensive, -10 means a 10% discount, for every night in the range
const seasonalPriceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    percent: { type: Number, required: true, min: -80, max: 300 },
    roomType: { type: String, enum: ['all', 'single', 'double', 'deluxe', 'suite'], default: 'all' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SeasonalPrice', seasonalPriceSchema);
