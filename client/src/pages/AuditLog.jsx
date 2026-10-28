import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import Pager from '../components/Pager';
import { formatDateTime, getErrorMessage } from '../utils/format';

// Admin: activity log and security monitoring (logins, failed logins, bookings, payments, admin actions, server errors)
export default function AuditLog() {
  const [data, setData] = useState(null);
  const [level, setLevel] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/audit', { params: { page, limit: 15, ...(level ? { level } : {}), ...(search ? { q: search } : {}) } });
      setData(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [page, level, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-end mb-3 gap-2">
        <h2 className="mb-0">Activity log</h2>
        <form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
          <select className="form-select w-auto" value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} aria-label="Filter by level">
            <option value="">All levels</option><option value="info">Info</option><option value="warn">Warnings (security)</option><option value="error">Errors</option>
          </select>
          <input className="form-control" placeholder="Search action, user, details" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the log" />
          <button className="btn btn-ink">Search</button>
        </form>
      </div>

      {!data ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <>
          <div className="table-responsive card shadow-sm">
            <table className="table table-sm mb-0">
              <thead><tr><th>Time</th><th>Level</th><th>User</th><th>Action</th><th>Details</th><th>IP</th></tr></thead>
              <tbody>
                {data.items.length === 0 && <tr><td colSpan="6" className="text-muted">Nothing logged yet.</td></tr>}
                {data.items.map((l) => (
                  <tr key={l._id}>
                    <td className="text-nowrap">{formatDateTime(l.createdAt)}</td>
                    <td><StatusBadge value={l.level} /></td>
                    <td>{l.userName || '-'}{l.role && <span className="text-muted small"> ({l.role})</span>}</td>
                    <td><code>{l.action}</code></td>
                    <td className="small">{l.details}</td>
                    <td className="small text-muted">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="small text-muted mt-2">{data.total} entries</div>
          <Pager page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
