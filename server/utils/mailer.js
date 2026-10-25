const Booking = require('../models/Booking');

// ---------------------------------------------------------------------------
// Email sending. Three modes, picked automatically from .env:
//   1. BREVO_API_KEY  -> Brevo HTTP API (works on Render free tier, SMTP is blocked there)
//   2. SMTP_HOST      -> any SMTP server (e.g. Gmail app password) via nodemailer
//   3. nothing set    -> emails are only printed in the server console (app still works)
// Emails are sent in the background and can never break a booking.
// ---------------------------------------------------------------------------
let smtpTransport = null;

const send = async ({ to, subject, html }) => {
  try {
    const from = process.env.MAIL_FROM;
    if (process.env.BREVO_API_KEY && from) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { name: 'HotelPro', email: from }, to: [{ email: to }], subject, htmlContent: html }),
      });
      if (!res.ok) console.error('Brevo email failed:', res.status, await res.text());
    } else if (process.env.SMTP_HOST && from) {
      if (!smtpTransport) {
        const nodemailer = require('nodemailer');
        const port = Number(process.env.SMTP_PORT) || 587;
        smtpTransport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure: port === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
      }
      await smtpTransport.sendMail({ from: `"HotelPro" <${from}>`, to, subject, html });
    } else {
      console.log(`[email disabled] to=${to} | subject="${subject}"`);
    }
  } catch (err) {
    console.error('Email error:', err.message);
  }
};

// ---- templates ----
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const day = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });

const layout = (title, intro, b) => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e3e7ec;border-radius:8px;overflow:hidden">
  <div style="background:#12263a;color:#fff;padding:16px 20px;font-size:20px">HotelPro</div>
  <div style="padding:20px;color:#1b2733">
    <h2 style="margin-top:0">${title}</h2>
    <p>${intro}</p>
    <div style="background:#f3f5f8;border-radius:6px;padding:14px;text-align:center;margin:16px 0">
      <div style="font-size:12px;color:#667">Room number</div>
      <div style="font-size:34px;font-weight:bold;color:#12263a">${esc(b.room?.roomNumber)}</div>
      <div style="font-size:13px;text-transform:capitalize">${esc(b.room?.type)} room</div>
    </div>
    <table style="width:100%;font-size:14px;border-collapse:collapse">
      <tr><td style="padding:4px 0;color:#667">Booking ID</td><td style="text-align:right"><b>${esc(b.bookingCode)}</b></td></tr>
      <tr><td style="padding:4px 0;color:#667">Check-in</td><td style="text-align:right">${day(b.checkIn)}</td></tr>
      <tr><td style="padding:4px 0;color:#667">Check-out</td><td style="text-align:right">${day(b.checkOut)}</td></tr>
      <tr><td style="padding:4px 0;color:#667">Guests</td><td style="text-align:right">${esc(b.guests)}</td></tr>
      <tr><td style="padding:4px 0;color:#667">Total</td><td style="text-align:right"><b>${money(b.totalPrice)}</b></td></tr>
    </table>
  </div>
  <div style="padding:12px 20px;background:#f3f5f8;color:#667;font-size:12px">This is an automated message from HotelPro.</div>
</div>`;

const build = (type, b) => {
  const name = esc(b.user.name);
  switch (type) {
    case 'confirmed':
      return { subject: `Booking confirmed - Room ${b.room?.roomNumber} (${b.bookingCode})`, html: layout('Booking confirmed', `Hi ${name}, your payment was received and your room is reserved.`, b) };
    case 'cancelled':
      return {
        subject: `Booking cancelled (${b.bookingCode})`,
        html: layout('Booking cancelled', `Hi ${name}, your booking has been cancelled.${b.paymentStatus === 'refunded' ? ' Your payment will be refunded.' : ''}`, b),
      };
    case 'checked-in':
      return { subject: `Welcome to HotelPro - your room is ${b.room?.roomNumber}`, html: layout('Welcome, you are checked in', `Hi ${name}, enjoy your stay.`, b) };
    case 'checked-out':
      return { subject: 'Thank you for staying with HotelPro', html: layout('Thank you for staying with us', `Hi ${name}, we hope you had a great stay. See you again soon.`, b) };
    default:
      return null;
  }
};

// Loads the booking (with guest + room) and emails the guest. Call WITHOUT await.
const emailBooking = async (type, bookingId) => {
  try {
    const b = await Booking.findById(bookingId).populate('user', 'name email').populate('room', 'roomNumber type');
    if (!b?.user?.email) return;
    const mail = build(type, b);
    if (mail) await send({ to: b.user.email, ...mail });
  } catch (err) {
    console.error('Email error:', err.message);
  }
};

const sendWelcome = (user) =>
  send({
    to: user.email,
    subject: 'Welcome to HotelPro',
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Welcome, ${esc(user.name)}!</h2><p>Your HotelPro account is ready. You can now search rooms by date and book instantly.</p></div>`,
  });

module.exports = { emailBooking, sendWelcome };
