const AuditLog = require('../models/AuditLog');

// Records an activity. Never blocks or breaks the request (errors are ignored).
const logActivity = (req, action, details = '', level = 'info', actor = req && req.user) => {
  AuditLog.create({
    user: actor && actor._id,
    userName: actor && (actor.name || actor.email),
    role: actor && actor.role,
    action,
    details: String(details).slice(0, 500),
    ip: req && req.ip,
    level,
  }).catch(() => {});
};

module.exports = { logActivity };
