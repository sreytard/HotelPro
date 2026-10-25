import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { formatDate, formatINR, getErrorMessage } from '../utils/format';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/bookings/my');
      setBookings(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load); // status changes (check-in etc.) show up instantly

  const cancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    setError('');
    try {
      await api.put(`/bookings/${id}/cancel`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">My bookings</h2>
      {error && <div className="alert alert-danger">{error}</div>}
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
                <tr key={b._id}>
                  <td>{b.room ? <><strong>Room {b.room.roomNumber}</strong><div className="text-muted small text-capitalize">{b.room.type} · {b.bookingCode}</div></> : 'Room removed'}</td>
                  <td>{formatDate(b.checkIn)} → {formatDate(b.checkOut)}<div className="text-muted small">{b.nights} night(s)</div></td>
                  <td>{b.guests}</td>
                  <td>{formatINR(b.totalPrice)}</td>
                  <td><StatusBadge value={b.status} /></td>
                  <td><StatusBadge value={b.paymentStatus} /></td>
                  <td className="text-end text-nowrap">
                    {b.status === 'pending' && <Link to={`/pay/${b._id}`} className="btn btn-sm btn-brass me-2">Pay now</Link>}
                    {['pending', 'confirmed'].includes(b.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => cancel(b._id)}>Cancel</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
