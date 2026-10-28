# HotelPro

Complete hotel booking and management system built with the **MERN stack** (MongoDB, Express, React, Node.js).

## Features

**Guests**
- Register / login (JWT), email verification, profile and password management
- Modern landing page: full-screen hero, background photos that crossfade as you scroll, scroll animations, gallery and guest reviews (photos are uploaded by the admin in Settings)
- Search rooms by dates, guests and type, with live availability and seasonal pricing
- Book with date-overlap validation, 30-minute payment hold, change dates, cancel or request a refund
- Pay by demo card / UPI, or Razorpay (test mode)
- Booking history, printable invoices (GST), room number + booking ID
- Reviews and star ratings after a completed stay
- Service requests (room service, housekeeping, maintenance) and customer support tickets
- In-app notifications, email confirmations, dark / light theme

**Hotel staff**
- Front desk: check-in, check-out, cancellations, approve or reject refund requests, change booking dates
- Room status (maintenance) and housekeeping board (rooms become dirty after check-out)
- Guest requests with status updates, notes and staff assignment
- Room inventory with photo upload

**Admin**
- Dashboard: occupancy, 7-day forecast, revenue, cancellation requests, open requests, system health
- Reports and analytics with charts and CSV export
- Payment tracking, user and staff management
- Seasonal pricing rules, platform settings (hotel details, GST, check-in/out times)
- Activity log and security monitoring (logins, failed logins, admin actions, server errors)

**Platform**
- Live updates with Socket.IO, background job that releases unpaid holds
- Security: bcrypt, JWT, role-based access, helmet, CORS, rate limiting, input sanitization (NoSQL injection), validated uploads, CSV-injection-safe export
- Performance: MongoDB indexes, aggregation, pagination, lazy-loaded pages, optimized Cloudinary images

## Folder structure

```
hotelpro/
├── server/            Express API (MVC)
│   ├── config/        db connection
│   ├── models/        User, Room, Booking, Payment
│   ├── controllers/   auth, room, booking, payment, admin
│   ├── routes/        route definitions
│   ├── middleware/    auth (JWT + roles), error handling
│   ├── utils/         dates, availability, helpers
│   ├── seed.js        demo data
│   └── server.js
└── client/            React app
    └── src/ (api, context, components, pages, utils)
```

## Run locally

**Requirements:** Node.js 18+ and MongoDB (local MongoDB Community, or a free MongoDB Atlas cluster).

```bash
# 1. install everything (run in the hotelpro folder)
npm run install-all

# 2. server/.env is already created for local MongoDB.
#    Using Atlas? put your Atlas connection string in MONGO_URI inside server/.env

# 3. load demo data (rooms, users, bookings)
npm run seed

# 4. start backend (port 5000) and frontend (port 5173) together
npm run dev
```

Open **http://localhost:5173**

### Demo accounts (created by `npm run seed`)

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Guest | guest@hotelpro.com  | Guest@123 |

`admin@hotelpro.com` and `staff@hotelpro.com` are also created. Their passwords are set while seeding with the
`SEED_ADMIN_PASSWORD` and `SEED_STAFF_PASSWORD` environment variables (at least 8 characters) and are shared privately.
On a local database, if you skip these variables, the defaults inside `server/seed.js` are used.
The seed refuses to run against an online (Atlas) database without them.

## API overview

| Area | Endpoints (all under /api) |
|------|----------------------------|
| Auth | POST /auth/register, /auth/login, /auth/verify-email, /auth/resend-verification · GET /auth/me · PUT /auth/profile, /auth/password |
| Rooms | GET /rooms, /rooms/:id, /rooms/:id/availability · POST /rooms, /rooms/upload · PUT /rooms/:id, /rooms/:id/housekeeping · DELETE /rooms/:id |
| Bookings | POST /bookings · GET /bookings/my, /bookings (staff), /bookings/:id, /bookings/:id/invoice · PUT /bookings/:id (change dates), /:id/cancel, /:id/reject-cancel, /:id/check-in, /:id/check-out |
| Payments | GET /payments/config, /payments/my, /payments (admin) · POST /payments/:bookingId, /:bookingId/razorpay/order, /:bookingId/razorpay/verify |
| Reviews | GET /reviews/room/:roomId, /reviews/my · POST /reviews · DELETE /reviews/:id (admin) |
| Notifications | GET /notifications · PUT /notifications/read-all, /notifications/:id/read |
| Requests | POST /requests · GET /requests/my, /requests (staff), /requests/staff · PUT /requests/:id |
| Pricing and settings | /seasons (admin CRUD) · GET /settings · PUT /settings (admin) |
| Admin | GET /admin/stats, /admin/reports, /admin/reports/export, /admin/audit, /admin/health, /admin/users · POST /admin/users · DELETE /admin/users/:id |

## What is and is not in the project

Built: everything in the feature list above.

Not built (kept out on purpose to stay a single-hotel project): multiple hotels (there is one hotel), a separate room-categories collection (room type is a field), Redis caching, microservices, load balancing, automated tests and Stripe (Razorpay is used instead).
Handled by the hosting: HTTPS and CDN (Vercel), database encryption at rest (MongoDB Atlas).

## Optional services (email and photos)

Everything works without these. If you skip them, emails are only printed in the server console and photos are saved in `server/uploads` (local only).
Add the keys to `server/.env` (locally) or to the Render environment variables (deployed). See `server/.env.example`.

**Email**
- Locally: use SMTP, e.g. Gmail with an App Password: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (your Gmail).
- On Render (free tier blocks SMTP): create a free Brevo account, verify a sender email, create an API key. Set `BREVO_API_KEY` and `MAIL_FROM` (the verified sender).

**Razorpay (optional, test mode)**
- Create a free Razorpay account, switch to Test mode, and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the server. A RAZORPAY button then appears on the payment page.

**Email verification**
- When an email service is configured, new accounts get a verification link. Set `REQUIRE_EMAIL_VERIFICATION=true` to block booking until the email is verified (leave it off until emails work).

**Photos**
- Create a free Cloudinary account and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Needed when deployed, because Render's disk is wiped on restart.

## Deploy

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "HotelPro - initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/hotelpro.git
git push -u origin main
```
(`.env` files are git-ignored, so secrets are never uploaded.)

### 2. Database - MongoDB Atlas (free)
Create a free cluster, add a database user, allow network access `0.0.0.0/0`, copy the connection string.
Then run the seed once against Atlas: put the Atlas string in `server/.env` as `MONGO_URI`, set `SEED_ADMIN_PASSWORD` and `SEED_STAFF_PASSWORD`, then run `npm run seed`.

### 3. Backend - Render (free)
New **Web Service** -> connect your GitHub repo -> Root Directory `server`
Build command `npm install` · Start command `npm start`
Environment variables: `MONGO_URI`, `JWT_SECRET` (long random text), `NODE_ENV=production`, `CLIENT_URL` (your Vercel URL, add after step 4)
Optional: `BREVO_API_KEY`, `MAIL_FROM`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### 4. Frontend - Vercel (free)
New Project -> import the repo -> Root Directory `client` (framework: Vite)
Environment variable: `VITE_API_URL` = `https://<your-render-service>.onrender.com/api`
Deploy, then copy the Vercel URL into `CLIENT_URL` on Render and redeploy the server.

> Render's free tier sleeps after inactivity: the first request can take ~50 seconds. Open the API once before your demo.

## Demo video checklist

1. Guest: sign up -> search by dates -> open a room -> book -> pay (card 4242 4242 4242 4242)
2. Show a clash: try booking the same room for overlapping dates -> "not available"
3. Staff: Front desk -> check-in -> check-out
4. Admin: Dashboard (occupancy, revenue), Manage rooms (add/edit), Users (add staff)
