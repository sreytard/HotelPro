import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { formatDate, formatINR, getErrorMessage } from '../utils/format';

const Stat = ({ label, value, hint }) => (
  <div className="col-6 col-lg-3">
    <div className="card p-3 h-100 shadow-sm">
      <div className="text-muted small">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="text-muted small">{hint}</div>}
    </div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const loadStats = () => api.get('/admin/stats').then((r) => setStats(r.data)).catch((e) => setError(getErrorMessage(e)));
  useEffect(() => { loadStats(); }, []);
  useLiveRefresh(loadStats); // numbers update live as bookings happen

  if (error) return <div className="container py-4"><div className="alert alert-danger">{error}</div></div>;
  if (!stats) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;

  const maxRevenue = Math.max(...stats.revenueLast7Days.map((d) => d.total), 1);

  return (
    <div className="container py-4">
      <h2 className="mb-3">Dashboard</h2>

      <div className="row g-3 mb-4">
        <Stat label="Occupancy now" value={`${stats.occupancyRate}%`} hint={`${stats.occupiedNow} of ${stats.totalRooms - stats.maintenanceRooms} sellable rooms`} />
        <Stat label="Arrivals today" value={stats.arrivalsToday} hint="Confirmed, not yet checked in" />
        <Stat label="Departures due" value={stats.departuresToday} hint="Checked-in guests leaving today" />
        <Stat label="Total revenue" value={formatINR(stats.totalRevenue)} hint={`${stats.totalGuests} registered guests`} />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="card p-3 h-100 shadow-sm">
            <h5>Occupancy</h5>
            <div className="progress mb-3" style={{ height: 22 }} role="progressbar" aria-valuenow={stats.occupancyRate} aria-valuemin="0" aria-valuemax="100">
              <div className="progress-bar" style={{ width: `${stats.occupancyRate}%`, background: 'var(--ink)' }}>{stats.occupancyRate}%</div>
            </div>
            <h6 className="mt-2">Bookings by status</h6>
            <ul className="list-unstyled mb-0">
              {Object.entries(stats.bookingsByStatus).map(([s, n]) => (
                <li key={s} className="d-flex justify-content-between align-items-center py-1">
                  <StatusBadge value={s} /> <strong>{n}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card p-3 h-100 shadow-sm">
            <h5>Revenue, last 7 days</h5>
            <div className="d-flex align-items-end gap-2" style={{ height: 180 }}>
              {stats.revenueLast7Days.map((d) => (
                <div className="bar-col" key={d.date} title={`${d.date}: ${formatINR(d.total)}`}>
                  <small className="text-muted">{d.total ? formatINR(d.total) : ''}</small>
                  <div className="bar" style={{ height: `${(d.total / maxRevenue) * 130}px` }} />
                  <small className="text-muted mt-1">{d.date.slice(5)}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white"><h5 className="mb-0">Recent bookings</h5></div>
        <div className="table-responsive">
          <table className="table mb-0">
            <thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recentBookings.length === 0 && <tr><td colSpan="5" className="text-muted">No bookings yet.</td></tr>}
              {stats.recentBookings.map((b) => (
                <tr key={b._id}>
                  <td>{b.user?.name || 'Deleted user'}</td>
                  <td>{b.room ? <><strong>Room {b.room.roomNumber}</strong><div className="text-muted small text-capitalize">{b.room.type} · {b.bookingCode}</div></> : 'Room removed'}</td>
                  <td>{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
                  <td>{formatINR(b.totalPrice)}</td>
                  <td><StatusBadge value={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
