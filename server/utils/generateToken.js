const jwt = require('jsonwebtoken');

// Signs a JWT containing the user id
module.exports = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
