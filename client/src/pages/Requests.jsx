import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import Pager from '../components/Pager';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { formatDateTime, getErrorMessage } from '../utils/format';

const LABEL = { room_service: 'Room service', housekeeping: 'Housekeeping', maintenance: 'Maintenance', support: 'Support' };

// Staff: guest service requests and support tickets. Update status, assign a staff member, add a note.
export default function Requests() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [staff, setStaff] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/requests', { params: { page, limit: 10, ...(status ? { status } : {}) } });
      setData(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/requests/staff').then((r) => setStaff(r.data)).catch(() => {}); }, []);
  useLiveRefresh(() => load(true));

  const update = async (id, changes) => {
    try {
      await api.put(`/requests/${id}`, changes);
      toast.success('Request updated.');
      load(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h2 className="mb-0">Guest requests</h2>
        <select className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All requests</option>
          <option value="open">Open</option>
          <option value="in-progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : data.items.length === 0 ? (
        <div className="alert alert-info">No requests found.</div>
      ) : (
        <div className="table-responsive card shadow-sm">
          <table className="table mb-0">
            <thead><tr><th>Guest</th><th>Request</th><th>Status</th><th>Assigned to</th><th>Note for guest/team</th></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r._id}>
                  <td>{r.user?.name}<div className="text-muted small">{r.room ? `Room ${r.room.roomNumber}` : 'No active stay'} · {formatDateTime(r.createdAt)}</div></td>
                  <td><span className="badge text-bg-secondary me-1">{LABEL[r.type]}</span>{r.message}</td>
                  <td style={{ minWidth: 150 }}>
                    <StatusBadge value={r.status} />
                    <select className="form-select form-select-sm mt-1" value={r.status} onChange={(e) => update(r._id, { status: e.target.value })} aria-label="Change status">
                      <option value="open">open</option><option value="in-progress">in-progress</option><option value="resolved">resolved</option>
                    </select>
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <select className="form-select form-select-sm" value={r.assignedTo?._id || ''} onChange={(e) => update(r._id, { assignedTo: e.target.value || null })} aria-label="Assign to staff">
                      <option value="">Unassigned</option>
                      {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 200 }}>
                    <input key={r.updatedAt} className="form-control form-control-sm" defaultValue={r.staffNote || ''} maxLength={300} placeholder="Add a note" aria-label="Staff note"
                      onBlur={(e) => e.target.value !== (r.staffNote || '') && update(r._id, { staffNote: e.target.value })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={data.page} pages={data.pages} onChange={setPage} />
    </div>
  );
}
