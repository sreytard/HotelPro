import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { formatINR, getErrorMessage, todayISO } from '../utils/format';

const COLORS = ['#12263a', '#b8893b', '#4f7ca8', '#8a5a44'];
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Reports & analytics: revenue, bookings, occupancy, room types. Export to CSV.
export default function Reports() {
  const [range, setRange] = useState({ from: daysAgo(29), to: todayISO() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reports', { params: range });
      setData(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    try {
      const res = await api.get('/admin/reports/export', { params: range, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotelpro-bookings-${range.from}-to-${range.to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const tick = (d) => d.slice(5);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-end mb-3 gap-2">
        <h2 className="mb-0">Reports & analytics</h2>
        <div className="d-flex flex-wrap gap-2 align-items-end">
          <div><label className="form-label small mb-0" htmlFor="rf">From</label><input id="rf" type="date" className="form-control" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
          <div><label className="form-label small mb-0" htmlFor="rt">To</label><input id="rt" type="date" className="form-control" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
          <button className="btn btn-brass" onClick={exportCsv}>Export bookings CSV</button>
        </div>
      </div>

      {loading || !data ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            {[
              ['Revenue', formatINR(data.totals.revenue)],
              ['Bookings created', data.totals.bookings],
              ['Cancellation rate', `${data.totals.cancelRate}%`],
              ['Average stay', `${data.totals.avgNights} nights`],
            ].map(([label, value]) => (
              <div className="col-6 col-lg-3" key={label}><div className="card p-3 shadow-sm"><div className="text-muted small">{label}</div><div className="stat-value">{value}</div></div></div>
            ))}
          </div>

          <div className="row g-3">
            <div className="col-lg-6">
              <div className="card p-3 shadow-sm"><h5>Revenue per day</h5>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.revenueByDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={tick} /><YAxis /><Tooltip formatter={(v) => formatINR(v)} /><Bar dataKey="total" name="Revenue" fill="#b8893b" /></BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card p-3 shadow-sm"><h5>Bookings created per day</h5>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.bookingsByDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={tick} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Bookings" fill="#12263a" /></BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-lg-8">
              <div className="card p-3 shadow-sm"><h5>Occupancy per day (%)</h5>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.occupancyByDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={tick} /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="rate" name="Occupancy %" stroke="#12263a" strokeWidth={2} dot={false} /></LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card p-3 shadow-sm"><h5>Bookings by room type</h5>
                {data.byRoomType.length === 0 ? <p className="text-muted">No bookings in this period.</p> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart><Pie data={data.byRoomType} dataKey="bookings" nameKey="type" outerRadius={80} label>{data.byRoomType.map((e, i) => <Cell key={e.type} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
