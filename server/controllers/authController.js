const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const generateToken = require('../utils/generateToken');
const { sendWelcome } = require('../utils/mailer');

// Shape of the object returned to the frontend after login/register
const authResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  token: generateToken(user._id),
});

// POST /api/auth/register  (public) - always creates a GUEST account.
// The role is never read from the request, so nobody can self-register as admin.
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw httpError(400, 'Name, email and password are required');
  }
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw httpError(409, 'This email is already registered');

  const user = await User.create({ name, email, password, phone });
  sendWelcome(user); // background, never blocks signup
  res.status(201).json(authResponse(user));
});

// POST /api/auth/login  (public)
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw httpError(400, 'Email and password are required');
  }
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw httpError(401, 'Invalid email or password');
  }
  res.json(authResponse(user));
});

// GET /api/auth/me  (logged in)
const getMe = asyncHandler(async (req, res) => {
  const { _id, name, email, role, phone } = req.user;
  res.json({ _id, name, email, role, phone });
});

module.exports = { register, login, getMe };
