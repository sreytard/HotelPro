import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { formatDate, formatINR, getErrorMessage } from '../utils/format';

const FILTERS = ['', 'pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'];

// Front desk: check guests in/out and cancel bookings
export default function StaffBookings() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/bookings', { params: status ? { status } : {} });
      setBookings(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(() => load(true)); // new bookings appear without refreshing

  const act = async (id, action) => {
    setError('');
    try {
      await api.put(`/bookings/${id}/${action}`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h2 className="mb-0">Front desk</h2>
        <select className="form-select w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          {FILTERS.map((f) => <option key={f} value={f}>{f || 'All bookings'}</option>)}
        </select>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : bookings.length === 0 ? (
        <div className="alert alert-info">No bookings found.</div>
      ) : (
        <div className="table-responsive card shadow-sm">
          <table className="table mb-0">
            <thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Total</th><th>Status</th><th>Payment</th><th /></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>{b.user?.name || 'Deleted user'}<div className="text-muted small">{b.user?.email}</div></td>
                  <td>{b.room ? <><strong>Room {b.room.roomNumber}</strong><div className="text-muted small text-capitalize">{b.room.type} · {b.bookingCode}</div></> : 'Room removed'}</td>
                  <td>{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
                  <td>{formatINR(b.totalPrice)}</td>
                  <td><StatusBadge value={b.status} /></td>
                  <td><StatusBadge value={b.paymentStatus} /></td>
                  <td className="text-end text-nowrap">
                    {b.status === 'confirmed' && <button className="btn btn-sm btn-ink me-2" onClick={() => act(b._id, 'check-in')}>Check in</button>}
                    {b.status === 'checked-in' && <button className="btn btn-sm btn-brass me-2" onClick={() => act(b._id, 'check-out')}>Check out</button>}
                    {['pending', 'confirmed'].includes(b.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => window.confirm('Cancel this booking?') && act(b._id, 'cancel')}>Cancel</button>}
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
