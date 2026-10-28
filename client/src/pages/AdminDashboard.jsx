import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { formatDate, formatINR, getErrorMessage } from '../utils/format';

const Stat = ({ label, value, hint, to }) => (
  <div className="col-6 col-lg-3">
    <div className="card p-3 h-100 shadow-sm">
      <div className="text-muted small">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="text-muted small">{hint}</div>}
      {to && <Link to={to} className="small stretched-link">Open</Link>}
    </div>
  </div>
);

const Bars = ({ data, valueKey, format, max }) => (
  <div className="d-flex align-items-end gap-2" style={{ height: 180 }}>
    {data.map((d) => (
      <div className="bar-col" key={d.date} title={`${d.date}: ${format(d[valueKey])}`}>
        <small className="text-muted">{d[valueKey] ? format(d[valueKey]) : ''}</small>
        <div className="bar" style={{ height: `${(d[valueKey] / max) * 130}px` }} />
        <small className="text-muted mt-1">{d.date.slice(5)}</small>
      </div>
    ))}
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  const loadStats = () => api.get('/admin/stats').then((r) => setStats(r.data)).catch((e) => setError(getErrorMessage(e)));
  useEffect(() => {
    loadStats();
    api.get('/admin/health').then((r) => setHealth(r.data)).catch(() => {});
  }, []);
  useLiveRefresh(loadStats); // numbers update live as bookings happen

  if (error) return <div className="container py-4"><div className="alert alert-danger">{error}</div></div>;
  if (!stats) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;

  const maxRevenue = Math.max(...stats.revenueLast7Days.map((d) => d.total), 1);

  return (
    <div className="container py-4">
      <h2 className="mb-3">Dashboard</h2>

      <div className="row g-3 mb-3">
        <Stat label="Occupancy now" value={`${stats.occupancyRate}%`} hint={`${stats.occupiedNow} of ${stats.totalRooms - stats.maintenanceRooms} sellable rooms`} />
        <Stat label="Arrivals today" value={stats.arrivalsToday} hint="Confirmed, not yet checked in" />
        <Stat label="Departures due" value={stats.departuresToday} hint="Checked-in guests leaving today" />
        <Stat label="Total revenue" value={formatINR(stats.totalRevenue)} hint={`${stats.totalGuests} registered guests`} />
      </div>
      <div className="row g-3 mb-4">
        <Stat label="Cancellation requests" value={stats.cancelRequests} hint="Waiting for a decision" to="/staff/bookings" />
        <Stat label="Open guest requests" value={stats.openRequests} hint="Service and support" to="/staff/requests" />
        <Stat label="Rooms to clean" value={stats.dirtyRooms} hint="Marked dirty" to="/staff/housekeeping" />
        <Stat label="Under maintenance" value={stats.maintenanceRooms} hint="Not bookable" to="/admin/rooms" />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-4">
          <div className="card p-3 h-100 shadow-sm">
            <h5>Occupancy</h5>
            <div className="progress mb-3" style={{ height: 22 }} role="progressbar" aria-valuenow={stats.occupancyRate} aria-valuemin="0" aria-valuemax="100">
              <div className="progress-bar" style={{ width: `${stats.occupancyRate}%`, background: 'var(--ink)' }}>{stats.occupancyRate}%</div>
            </div>
            <h6 className="mt-2">Bookings by status</h6>
            <ul className="list-unstyled mb-0">
              {Object.entries(stats.bookingsByStatus).map(([s, n]) => (
                <li key={s} className="d-flex justify-content-between align-items-center py-1"><StatusBadge value={s} /> <strong>{n}</strong></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card p-3 h-100 shadow-sm">
            <h5>Expected occupancy, next 7 days</h5>
            <Bars data={stats.occupancyForecast} valueKey="rate" format={(v) => `${v}%`} max={100} />
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card p-3 h-100 shadow-sm">
            <h5>Revenue, last 7 days</h5>
            <Bars data={stats.revenueLast7Days} valueKey="total" format={formatINR} max={maxRevenue} />
          </div>
        </div>
      </div>

      {health && (
        <div className="card p-3 shadow-sm mb-4">
          <h5>System health</h5>
          <div className="row small g-2">
            <div className="col-6 col-md-3">Database: <strong className={health.database === 'connected' ? 'text-success' : 'text-danger'}>{health.database}</strong></div>
            <div className="col-6 col-md-3">Uptime: <strong>{health.uptimeMinutes} min</strong></div>
            <div className="col-6 col-md-3">Errors (24h): <strong className={health.errors24h ? 'text-danger' : ''}>{health.errors24h}</strong></div>
            <div className="col-6 col-md-3">Failed logins (24h): <strong>{health.failedLogins24h}</strong></div>
            <div className="col-6 col-md-3">Email: <strong>{health.services.email ? 'on' : 'off'}</strong></div>
            <div className="col-6 col-md-3">Photo storage: <strong>{health.services.photos ? 'Cloudinary' : 'local'}</strong></div>
            <div className="col-6 col-md-3">Razorpay: <strong>{health.services.razorpay ? 'on (test)' : 'off'}</strong></div>
            <div className="col-6 col-md-3">Memory: <strong>{health.memoryMB} MB</strong></div>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-header"><h5 className="mb-0">Recent bookings</h5></div>
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
