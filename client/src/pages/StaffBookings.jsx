import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import Pager from '../components/Pager';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { formatDate, formatINR, getErrorMessage, todayISO, toISO } from '../utils/format';

const FILTERS = [
  ['', 'All bookings'], ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['checked-in', 'Checked in'],
  ['checked-out', 'Checked out'], ['cancelled', 'Cancelled'], ['cancel-requested', 'Cancellation requests'],
];

// Front desk: check guests in/out, handle cancellation requests, change dates, cancel
export default function StaffBookings() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null); // booking id whose "change dates" form is open
  const [mod, setMod] = useState({ checkIn: '', checkOut: '', guests: 1 });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/bookings', { params: { page, limit: 10, ...(status ? { status } : {}) } });
      setData(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(() => load(true)); // new bookings appear without refreshing

  const act = async (id, action, message) => {
    try {
      await api.put(`/bookings/${id}/${action}`);
      toast.success(message);
      load(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openModify = (b) => {
    setMod({ checkIn: toISO(b.checkIn), checkOut: toISO(b.checkOut), guests: b.guests });
    setPanel(b._id);
  };

  const saveModify = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/bookings/${panel}`, { ...mod, guests: Number(mod.guests) });
      toast.success('Booking updated.');
      setPanel(null);
      load(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h2 className="mb-0">Front desk</h2>
        <select className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          {FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : data.items.length === 0 ? (
        <div className="alert alert-info">No bookings found.</div>
      ) : (
        <div className="table-responsive card shadow-sm">
          <table className="table mb-0">
            <thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Total</th><th>Status</th><th>Payment</th><th /></tr></thead>
            <tbody>
              {data.items.map((b) => {
                const balance = b.paymentStatus === 'paid' && b.amountPaid !== undefined ? b.totalPrice - b.amountPaid : 0;
                return (
                  <Fragment key={b._id}>
                    <tr>
                      <td>{b.user?.name || 'Deleted user'}<div className="text-muted small">{b.user?.email}</div></td>
                      <td>{b.room ? <><strong>Room {b.room.roomNumber}</strong><div className="text-muted small text-capitalize">{b.room.type} · {b.bookingCode}</div></> : 'Room removed'}</td>
                      <td>{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
                      <td>{formatINR(b.totalPrice)}{balance !== 0 && <div className="small text-danger">{balance > 0 ? `Balance due ${formatINR(balance)}` : `Refund ${formatINR(-balance)}`}</div>}</td>
                      <td>
                        <StatusBadge value={b.status} />
                        {b.cancelRequested && <div className="small mt-1 text-warning-emphasis">Cancellation requested{b.cancelReason ? `: ${b.cancelReason}` : ''}</div>}
                      </td>
                      <td><StatusBadge value={b.paymentStatus} /></td>
                      <td className="text-end text-nowrap">
                        {b.status === 'confirmed' && <button className="btn btn-sm btn-ink me-1" onClick={() => act(b._id, 'check-in', 'Guest checked in.')}>Check in</button>}
                        {b.status === 'checked-in' && <button className="btn btn-sm btn-brass me-1" onClick={() => act(b._id, 'check-out', 'Guest checked out. Room marked dirty.')}>Check out</button>}
                        {b.status === 'pending' && <Link to={`/pay/${b._id}`} className="btn btn-sm btn-outline-secondary me-1">Take payment</Link>}
                        {b.cancelRequested && <button className="btn btn-sm btn-danger me-1" onClick={() => window.confirm('Approve and refund this booking?') && act(b._id, 'cancel', 'Cancelled and refunded.')}>Approve & refund</button>}
                        {b.cancelRequested && <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => act(b._id, 'reject-cancel', 'Request rejected.')}>Reject</button>}
                        {['pending', 'confirmed'].includes(b.status) && <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openModify(b)}>Change dates</button>}
                        {['pending', 'confirmed'].includes(b.status) && !b.cancelRequested && (
                          <button className="btn btn-sm btn-outline-danger me-1" onClick={() => window.confirm('Cancel this booking?') && act(b._id, 'cancel', 'Booking cancelled.')}>Cancel</button>
                        )}
                        {b.paymentStatus !== 'unpaid' && <Link to={`/invoice/${b._id}`} className="btn btn-sm btn-outline-secondary">Invoice</Link>}
                      </td>
                    </tr>
                    {panel === b._id && (
                      <tr>
                        <td colSpan="7" className="bg-body-tertiary">
                          <form className="row g-2 align-items-end" onSubmit={saveModify}>
                            <div className="col-md-3"><label className="form-label small" htmlFor={`sci${b._id}`}>Check-in</label><input id={`sci${b._id}`} type="date" className="form-control" min={todayISO()} value={mod.checkIn} onChange={(e) => setMod({ ...mod, checkIn: e.target.value })} required /></div>
                            <div className="col-md-3"><label className="form-label small" htmlFor={`sco${b._id}`}>Check-out</label><input id={`sco${b._id}`} type="date" className="form-control" min={mod.checkIn || todayISO()} value={mod.checkOut} onChange={(e) => setMod({ ...mod, checkOut: e.target.value })} required /></div>
                            <div className="col-md-2"><label className="form-label small" htmlFor={`sgu${b._id}`}>Guests</label><input id={`sgu${b._id}`} type="number" min="1" className="form-control" value={mod.guests} onChange={(e) => setMod({ ...mod, guests: e.target.value })} required /></div>
                            <div className="col-md-4 d-flex gap-2"><button className="btn btn-brass">Save new dates</button><button type="button" className="btn btn-outline-secondary" onClick={() => setPanel(null)}>Close</button></div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={data.page} pages={data.pages} onChange={setPage} />
    </div>
  );
}
