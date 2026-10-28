const mongoose = require('mongoose');

// Activity log + security monitoring (logins, failed logins, bookings, payments, admin actions, server errors)
const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, maxlength: 120 },
    role: { type: String, maxlength: 20 },
    action: { type: String, required: true, maxlength: 60 },
    details: { type: String, maxlength: 500 },
    ip: { type: String, maxlength: 60 },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ level: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
