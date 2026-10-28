import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { formatDate, formatDateTime, formatINR, getErrorMessage } from '../utils/format';

// Printable invoice (use "Print / Save as PDF")
export default function Invoice() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/bookings/${bookingId}/invoice`).then((r) => setInv(r.data)).catch((e) => setError(getErrorMessage(e)));
  }, [bookingId]);

  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div><Link to="/my-bookings">Back to bookings</Link></div>;
  if (!inv) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;

  const { booking: b, settings: s } = inv;
  return (
    <div className="container py-4" style={{ maxWidth: 820 }}>
      <div className="d-flex justify-content-between mb-3 no-print">
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="btn btn-ink" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="card p-4 shadow-sm">
        <div className="d-flex justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="brand mb-1">{s.hotelName}</h3>
            <div className="small text-muted">{s.address}<br />{s.phone} · {s.email}</div>
          </div>
          <div className="text-end">
            <h4 className="mb-1">INVOICE</h4>
            <div><strong>{inv.invoiceNumber}</strong></div>
            <div className="small text-muted">Issued {formatDateTime(b.updatedAt)}</div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-sm-6">
            <div className="text-muted small">Billed to</div>
            <strong>{b.user?.name}</strong><div className="small">{b.user?.email}</div>
          </div>
          <div className="col-sm-6 text-sm-end">
            <div className="text-muted small">Stay</div>
            <strong className="text-capitalize">Room {b.room?.roomNumber} ({b.room?.type})</strong>
            <div className="small">{formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} night(s) · {b.guests} guest(s)</div>
            <div className="small">Check-in from {s.checkInTime}, check-out by {s.checkOutTime}</div>
          </div>
        </div>

        <table className="table">
          <thead><tr><th>Description</th><th className="text-end">Amount</th></tr></thead>
          <tbody>
            <tr><td>Room charges ({b.nights} night(s), excluding tax)</td><td className="text-end">{formatINR(inv.subtotal)}</td></tr>
            <tr><td>GST ({s.taxPercent}%)</td><td className="text-end">{formatINR(inv.taxAmount)}</td></tr>
            <tr className="fw-bold"><td>Total</td><td className="text-end">{formatINR(inv.total)}</td></tr>
            <tr><td>Paid</td><td className="text-end">{formatINR(inv.paid)}</td></tr>
            {inv.balance !== 0 && (
              <tr className="fw-bold"><td>{inv.balance > 0 ? 'Balance due at the front desk' : 'Refund due to guest'}</td><td className="text-end">{formatINR(Math.abs(inv.balance))}</td></tr>
            )}
          </tbody>
        </table>

        <h6>Payments</h6>
        <table className="table table-sm">
          <thead><tr><th>Date</th><th>Method</th><th>Transaction</th><th>Status</th><th className="text-end">Amount</th></tr></thead>
          <tbody>
            {inv.payments.map((p) => (
              <tr key={p._id}>
                <td>{formatDateTime(p.createdAt)}</td>
                <td className="text-uppercase">{p.method}{p.last4 ? ` ····${p.last4}` : ''}</td>
                <td>{p.transactionId}</td><td>{p.status}</td><td className="text-end">{formatINR(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small text-muted mb-0">Room prices include GST. Thank you for choosing {s.hotelName}.</p>
      </div>
    </div>
  );
}
