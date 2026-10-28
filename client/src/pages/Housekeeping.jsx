import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { getErrorMessage } from '../utils/format';

// Staff: housekeeping board. Rooms turn "dirty" after check-out; staff mark them cleaning / clean.
export default function Housekeeping() {
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/rooms', { params: { all: true } });
      setRooms(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  const setStatus = async (room, status) => {
    try {
      await api.put(`/rooms/${room._id}/housekeeping`, { status });
      toast.success(`Room ${room.roomNumber} marked ${status}.`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const shown = rooms.filter((r) => !filter || (r.housekeeping || 'clean') === filter);
  const count = (s) => rooms.filter((r) => (r.housekeeping || 'clean') === s).length;

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h2 className="mb-0">Housekeeping</h2>
        <div className="btn-group" role="group" aria-label="Filter rooms">
          {[['', `All (${rooms.length})`], ['dirty', `Dirty (${count('dirty')})`], ['cleaning', `Cleaning (${count('cleaning')})`], ['clean', `Clean (${count('clean')})`]].map(([value, label]) => (
            <button key={value} type="button" className={`btn btn-sm ${filter === value ? 'btn-ink' : 'btn-outline-secondary'}`} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <div className="row g-3">
          {shown.map((r) => {
            const hk = r.housekeeping || 'clean';
            return (
              <div className="col-6 col-md-4 col-lg-3" key={r._id}>
                <div className="card p-3 h-100 shadow-sm">
                  <div className="d-flex justify-content-between align-items-start">
                    <div><strong className="fs-5">{r.roomNumber}</strong><div className="small text-muted text-capitalize">{r.type}</div></div>
                    <StatusBadge value={hk} />
                  </div>
                  {r.status === 'maintenance' && <div className="small text-muted mt-1">Under maintenance</div>}
                  <div className="d-flex flex-wrap gap-1 mt-3">
                    {hk !== 'dirty' && <button className="btn btn-sm btn-outline-danger" onClick={() => setStatus(r, 'dirty')}>Dirty</button>}
                    {hk !== 'cleaning' && <button className="btn btn-sm btn-outline-warning" onClick={() => setStatus(r, 'cleaning')}>Cleaning</button>}
                    {hk !== 'clean' && <button className="btn btn-sm btn-brass" onClick={() => setStatus(r, 'clean')}>Mark clean</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
