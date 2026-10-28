const Notification = require('../models/Notification');
const User = require('../models/User');
const { notifyChange } = require('./socket');

// In-app notification for one user (bell icon). Never throws.
const createNotification = async (userId, { title, message = '', type = 'info', link = '' }) => {
  try {
    await Notification.create({ user: userId, title, message, type, link });
    notifyChange('notification');
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// Notification for every staff and admin account
const notifyStaff = async (payload) => {
  try {
    const staff = await User.find({ role: { $in: ['staff', 'admin'] } }).select('_id');
    await Promise.all(staff.map((u) => createNotification(u._id, payload)));
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { createNotification, notifyStaff };
