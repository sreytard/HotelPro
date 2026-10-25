require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { initSocket } = require('./utils/socket');
const { expireStalePending } = require('./utils/availability');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
app.set('trust proxy', 1); // needed behind Render/Heroku proxies

// ---- security & utility middleware ----
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Basic brute-force protection on login/register
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

// Locally stored room photos (used only when Cloudinary is not configured)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

// ---- routes ----
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'HotelPro API' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use(notFound);
app.use(errorHandler);

// HTTP server + Socket.IO (live updates) share one port
const server = http.createServer(app);
initSocket(server, allowedOrigins);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => console.log(`HotelPro API running on port ${PORT}`));
  // Every minute: release rooms whose unpaid hold expired and tell open browsers
  setInterval(() => expireStalePending().catch(() => {}), 60 * 1000);
});
