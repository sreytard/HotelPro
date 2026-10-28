const mongoose = require('mongoose');

// Platform configuration - a single document, edited by the admin
const settingSchema = new mongoose.Schema(
  {
    hotelName: { type: String, default: 'HotelPro Hotel', trim: true, maxlength: 80 },
    address: { type: String, default: '12 Palace Road, Indore, Madhya Pradesh', trim: true, maxlength: 200 },
    phone: { type: String, default: '+91 98765 43210', trim: true, maxlength: 30 },
    email: { type: String, default: 'frontdesk@hotelpro.example', trim: true, maxlength: 80 },
    taxPercent: { type: Number, default: 12, min: 0, max: 50 }, // GST included in room prices
    checkInTime: { type: String, default: '14:00', maxlength: 5 },
    checkOutTime: { type: String, default: '11:00', maxlength: 5 },
    // Photos for the animated home page background (uploaded by the admin)
    heroImages: [{ type: String, trim: true, maxlength: 500 }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
