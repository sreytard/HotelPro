const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const generateToken = require('../utils/generateToken');
const { sendWelcome, sendVerification, mailConfigured } = require('../utils/mailer');
const { logActivity } = require('../utils/audit');

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

// Shape of the object returned to the frontend after login/register/profile update
const authResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  emailVerified: user.emailVerified !== false,
  token: generateToken(user._id),
});

// Creates a one-time token (stored hashed) and emails the verification link
const issueVerification = async (user) => {
  const token = crypto.randomBytes(32).toString('hex');
  user.verifyTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  sendVerification(user, `${clientUrl()}/verify-email/${token}`); // background
};

// POST /api/auth/register  (public) - always creates a GUEST account.
// The role is never read from the request, so nobody can self-register as admin.
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name.trim()) {
    throw httpError(400, 'Name, email and password are required');
  }
  if (!EMAIL_RE.test(email)) throw httpError(400, 'Please provide a valid email');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw httpError(409, 'This email is already registered');

  // With a real email provider, new accounts must verify their email; without one they are auto-verified
  const user = await User.create({
    name: name.trim(),
    email,
    password,
    phone: typeof phone === 'string' ? phone : undefined,
    emailVerified: !mailConfigured(),
  });
  if (!user.emailVerified) await issueVerification(user);
  sendWelcome(user); // background, never blocks signup
  logActivity(req, 'register', user.email, 'info', user);
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
    logActivity(req, 'login_failed', email, 'warn', { name: email }); // security monitoring
    throw httpError(401, 'Invalid email or password');
  }
  logActivity(req, 'login', user.email, 'info', user);
  res.json(authResponse(user));
});

// GET /api/auth/me  (logged in)
const getMe = asyncHandler(async (req, res) => {
  const { _id, name, email, role, phone, createdAt } = req.user;
  res.json({ _id, name, email, role, phone, createdAt, emailVerified: req.user.emailVerified !== false });
});

// PUT /api/auth/profile  (logged in) - name and phone
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { name, phone } = req.body;
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'Name cannot be empty');
    user.name = name.trim().slice(0, 80);
  }
  if (phone !== undefined) user.phone = String(phone).trim().slice(0, 20);
  await user.save();
  logActivity(req, 'profile_update', user.email);
  res.json(authResponse(user));
});

// PUT /api/auth/password  (logged in)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    throw httpError(400, 'Current and new password are required');
  }
  if (newPassword.length < 8) throw httpError(400, 'New password must be at least 8 characters');
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) throw httpError(400, 'Current password is incorrect');
  user.password = newPassword;
  await user.save();
  logActivity(req, 'password_change', user.email, 'warn');
  res.json({ message: 'Password changed' });
});

// POST /api/auth/verify-email  { token }  (public)
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw httpError(400, 'Invalid verification link');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ verifyTokenHash: hash, verifyTokenExpires: { $gt: new Date() } }).select(
    '+verifyTokenHash +verifyTokenExpires'
  );
  if (!user) throw httpError(400, 'This verification link is invalid or has expired');
  user.emailVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyTokenExpires = undefined;
  await user.save();
  logActivity(req, 'email_verified', user.email, 'info', user);
  res.json({ message: 'Email verified. Thank you!' });
});

// POST /api/auth/resend-verification  (logged in)
const resendVerification = asyncHandler(async (req, res) => {
  if (req.user.emailVerified !== false) throw httpError(400, 'Your email is already verified');
  if (!mailConfigured()) throw httpError(503, 'Email service is not configured on this server');
  const user = await User.findById(req.user._id);
  await issueVerification(user);
  res.json({ message: 'Verification email sent' });
});

module.exports = { register, login, getMe, updateProfile, changePassword, verifyEmail, resendVerification };
