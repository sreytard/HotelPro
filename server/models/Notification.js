const mongoose = require('mongoose');

// In-app notification (bell icon)
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, maxlength: 400 },
    type: { type: String, enum: ['info', 'success', 'warning'], default: 'info' },
    link: { type: String, maxlength: 200 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
