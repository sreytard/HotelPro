# HotelPro

Complete hotel booking and management system built with the **MERN stack** (MongoDB, Express, React, Node.js).

## Features

- **Auth**: register / login with JWT, passwords hashed with bcrypt, roles: `guest`, `staff`, `admin`
- **Rooms**: full CRUD, room types, pricing, amenities, images, maintenance mode
- **Real-time availability**: search rooms by dates, guests and type
- **Bookings**: date-overlap validation, 30-minute hold while paying, cancel, check-in, check-out
- **Payments**: mock card / UPI / cash flow (card ending `0002` is declined to demo failures)
- **Admin dashboard**: occupancy %, arrivals/departures, revenue (7-day chart), bookings by status
- **Live availability**: Socket.IO pushes changes instantly, so rooms, booked dates, front desk and dashboard update without refreshing
- **Room number + Booking ID**: shown after payment, in My bookings and in every email
- **Email notifications**: welcome, booking confirmed, cancelled (with refund note), check-in (room number) and check-out
- **Real room photos**: upload JPG/PNG/WebP from the computer (Cloudinary), gallery on the room page
- **Security**: helmet, CORS, rate-limited auth routes, role-based route protection, no self-registration as admin

## Tech stack

React 18 (Vite) · Bootstrap 5 · React Router · Axios · Node.js · Express · MongoDB · Mongoose · JWT

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
| Admin | admin@hotelpro.com  | Admin@123 |
| Staff | staff@hotelpro.com  | Staff@123 |
| Guest | guest@hotelpro.com  | Guest@123 |

## API overview

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | logged in |
| GET | /api/rooms (filters: type, guests, maxPrice, checkIn, checkOut) | public |
| POST / PUT | /api/rooms, /api/rooms/:id | staff, admin |
| DELETE | /api/rooms/:id | admin |
| POST | /api/bookings | logged in |
| GET | /api/bookings/my | logged in |
| GET | /api/bookings | staff, admin |
| PUT | /api/bookings/:id/cancel | owner, staff, admin |
| PUT | /api/bookings/:id/check-in, /check-out | staff, admin |
| POST | /api/payments/:bookingId | owner, staff, admin |
| GET | /api/admin/stats, /api/admin/users | admin |
| POST / DELETE | /api/admin/users, /api/admin/users/:id | admin |

## Optional services (email and photos)

Everything works without these. If you skip them, emails are only printed in the server console and photos are saved in `server/uploads` (local only).
Add the keys to `server/.env` (locally) or to the Render environment variables (deployed). See `server/.env.example`.

**Email**
- Locally: use SMTP, e.g. Gmail with an App Password: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (your Gmail).
- On Render (free tier blocks SMTP): create a free Brevo account, verify a sender email, create an API key. Set `BREVO_API_KEY` and `MAIL_FROM` (the verified sender).

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
Then run the seed once against Atlas: put the Atlas string in `server/.env` as `MONGO_URI` and run `npm run seed`.

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
