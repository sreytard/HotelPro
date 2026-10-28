const httpError = require('../utils/httpError');
const AuditLog = require('../models/AuditLog');

const notFound = (req, res, next) => next(httpError(404, `Route not found: ${req.originalUrl}`));

// Central error handler - every error ends up here as a clean JSON message
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller' : err.message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  } else if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue || {})[0] || 'Value'} already exists`;
  }

  if (status === 500) {
    console.error(err);
    // Error logging: unexpected server errors are saved for the admin's Activity log
    AuditLog.create({ action: 'server_error', details: `${req.method} ${req.originalUrl}: ${err.message}`, level: 'error', ip: req.ip }).catch(() => {});
  }
  res.status(status).json({ message: status === 500 && process.env.NODE_ENV === 'production' ? 'Server error' : message });
};

module.exports = { notFound, errorHandler };
