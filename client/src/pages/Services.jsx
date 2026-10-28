import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { formatDateTime, getErrorMessage } from '../utils/format';

const TYPES = [
  ['room_service', 'Room service (food, drinks, extras)'],
  ['housekeeping', 'Housekeeping (towels, cleaning)'],
  ['maintenance', 'Maintenance (something is broken)'],
  ['support', 'Customer support (questions, billing)'],
];

// Guest: service requests and customer support
export default function Services() {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ type: 'room_service', message: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/requests/my');
      setRequests(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load); // status updates from staff appear instantly

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/requests', form);
      toast.success('Request sent to the hotel team.');
      setForm({ ...form, message: '' });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <h2 className="mb-3">Services & support</h2>
      <form className="card p-3 shadow-sm mb-4" onSubmit={submit}>
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label" htmlFor="srt">What do you need?</label>
            <select id="srt" className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="srm">Details</label>
            <input id="srm" className="form-control" maxLength={500} placeholder="e.g. Two extra towels please" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required minLength={3} />
          </div>
          <div className="col-md-2 d-grid"><button className="btn btn-brass" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button></div>
        </div>
        <small className="text-muted mt-2">If you are checked in, the request is linked to your room automatically.</small>
      </form>

      <h5>My requests</h5>
      {requests.length === 0 ? (
        <div className="alert alert-info">You have not sent any requests yet.</div>
      ) : (
        <div className="table-responsive card shadow-sm">
          <table className="table mb-0">
            <thead><tr><th>Sent</th><th>Request</th><th>Status</th><th>Update from the hotel</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td className="text-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td><span className="badge text-bg-secondary me-1">{r.type.replace('_', ' ')}</span>{r.message}</td>
                  <td><StatusBadge value={r.status} /></td>
                  <td>{r.staffNote || (r.assignedTo ? `Assigned to ${r.assignedTo.name}` : '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
