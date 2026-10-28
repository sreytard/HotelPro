import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Rating from '@mui/material/Rating';
import { toast } from 'react-toastify';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { formatDate, formatINR, getErrorMessage, todayISO, toISO } from '../utils/format';

// Guest area: pay, change dates, cancel / request cancellation, invoice, review
export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [reviewed, setReviewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null); // { id, type: 'modify' | 'review' }
  const [mod, setMod] = useState({ checkIn: '', checkOut: '', guests: 1 });
  const [review, setReview] = useState({ rating: 5, comment: '' });

  const load = useCallback(async () => {
    try {
      const [b, r] = await Promise.all([api.get('/bookings/my'), api.get('/reviews/my')]);
      setBookings(b.data);
      setReviewed(r.data.map((x) => String(x.booking)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load); // status changes (check-in etc.) show up instantly

  const cancel = async (b) => {
    let reason = '';
    if (b.paymentStatus === 'paid') {
      reason = window.prompt('Your booking is paid, so the hotel will review your request and refund you if it is approved.\n\nReason for cancelling (optional):');
      if (reason === null) return;
    } else if (!window.confirm('Cancel this booking?')) {
      return;
    }
    try {
      const { data } = await api.put(`/bookings/${b._id}/cancel`, { reason });
      toast.success(data.requested ? 'Cancellation requested. The hotel will confirm soon.' : 'Booking cancelled.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openModify = (b) => {
    setMod({ checkIn: toISO(b.checkIn), checkOut: toISO(b.checkOut), guests: b.guests });
    setPanel({ id: b._id, type: 'modify' });
  };

  const saveModify = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/bookings/${panel.id}`, { ...mod, guests: Number(mod.guests) });
      toast.success('Booking updated.');
      setPanel(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reviews', { booking: panel.id, rating: review.rating, comment: review.comment });
      toast.success('Thank you for your review!');
      setPanel(null);
      setReview({ rating: 5, comment: '' });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">My bookings</h2>
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : bookings.length === 0 ? (
        <div className="alert alert-info">You have no bookings yet. <Link to="/">Browse rooms</Link></div>
      ) : (
        <div className="table-responsive card shadow-sm">
          <table className="table mb-0">
            <thead><tr><th>Room</th><th>Stay</th><th>Guests</th><th>Total</th><th>Status</th><th>Payment</th><th /></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <Fragment key={b._id}>
                  <tr>
                    <td>{b.room ? <><strong>Room {b.room.roomNumber}</strong><div className="text-muted small text-capitalize">{b.room.type} · {b.bookingCode}</div></> : 'Room removed'}</td>
                    <td>{formatDate(b.checkIn)} → {formatDate(b.checkOut)}<div className="text-muted small">{b.nights} night(s)</div></td>
                    <td>{b.guests}</td>
                    <td>{formatINR(b.totalPrice)}</td>
                    <td>
                      <StatusBadge value={b.status} />
                      {b.cancelRequested && <div><span className="badge text-bg-warning mt-1">cancellation requested</span></div>}
                    </td>
                    <td><StatusBadge value={b.paymentStatus} /></td>
                    <td className="text-end text-nowrap">
                      {b.status === 'pending' && <Link to={`/pay/${b._id}`} className="btn btn-sm btn-brass me-1">Pay now</Link>}
                      {b.status === 'pending' && <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openModify(b)}>Change dates</button>}
                      {['pending', 'confirmed'].includes(b.status) && !b.cancelRequested && (
                        <button className="btn btn-sm btn-outline-danger me-1" onClick={() => cancel(b)}>{b.paymentStatus === 'paid' ? 'Request cancellation' : 'Cancel'}</button>
                      )}
                      {b.paymentStatus !== 'unpaid' && <Link to={`/invoice/${b._id}`} className="btn btn-sm btn-outline-secondary me-1">Invoice</Link>}
                      {b.status === 'checked-in' && <Link to="/services" className="btn btn-sm btn-outline-secondary me-1">Request service</Link>}
                      {b.status === 'checked-out' && !reviewed.includes(String(b._id)) && (
                        <button className="btn btn-sm btn-ink" onClick={() => setPanel({ id: b._id, type: 'review' })}>Write a review</button>
                      )}
                    </td>
                  </tr>
                  {panel?.id === b._id && panel.type === 'modify' && (
                    <tr>
                      <td colSpan="7" className="bg-body-tertiary">
                        <form className="row g-2 align-items-end" onSubmit={saveModify}>
                          <div className="col-md-3"><label className="form-label small" htmlFor={`mci${b._id}`}>Check-in</label><input id={`mci${b._id}`} type="date" className="form-control" min={todayISO()} value={mod.checkIn} onChange={(e) => setMod({ ...mod, checkIn: e.target.value })} required /></div>
                          <div className="col-md-3"><label className="form-label small" htmlFor={`mco${b._id}`}>Check-out</label><input id={`mco${b._id}`} type="date" className="form-control" min={mod.checkIn || todayISO()} value={mod.checkOut} onChange={(e) => setMod({ ...mod, checkOut: e.target.value })} required /></div>
                          <div className="col-md-2"><label className="form-label small" htmlFor={`mgu${b._id}`}>Guests</label><input id={`mgu${b._id}`} type="number" min="1" className="form-control" value={mod.guests} onChange={(e) => setMod({ ...mod, guests: e.target.value })} required /></div>
                          <div className="col-md-4 d-flex gap-2"><button className="btn btn-brass">Save new dates</button><button type="button" className="btn btn-outline-secondary" onClick={() => setPanel(null)}>Close</button></div>
                        </form>
                      </td>
                    </tr>
                  )}
                  {panel?.id === b._id && panel.type === 'review' && (
                    <tr>
                      <td colSpan="7" className="bg-body-tertiary">
                        <form onSubmit={submitReview}>
                          <div className="mb-2"><strong>How was Room {b.room?.roomNumber}?</strong></div>
                          <Rating value={review.rating} onChange={(e, v) => setReview({ ...review, rating: v || 1 })} size="large" />
                          <textarea className="form-control my-2" rows="2" maxLength={600} placeholder="Tell other guests about your stay (optional)" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} aria-label="Review comment" />
                          <div className="d-flex gap-2"><button className="btn btn-brass">Submit review</button><button type="button" className="btn btn-outline-secondary" onClick={() => setPanel(null)}>Close</button></div>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
