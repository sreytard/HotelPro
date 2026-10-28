import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { setNotifications } from '../store/notificationsSlice';
import { formatDateTime } from '../utils/format';

// Notification center
export default function Notifications() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setData(res.data);
      dispatch(setNotifications(res.data)); // keeps the bell in the navbar in sync
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  const open = async (n) => {
    if (!n.read) await api.put(`/notifications/${n._id}/read`).catch(() => {});
    if (n.link) navigate(n.link);
    else load();
  };

  const readAll = async () => {
    await api.put('/notifications/read-all');
    load();
  };

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Notifications</h2>
        <button className="btn btn-sm btn-outline-secondary" onClick={readAll} disabled={data.unread === 0}>Mark all as read</button>
      </div>
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : data.items.length === 0 ? (
        <div className="alert alert-info">No notifications yet.</div>
      ) : (
        data.items.map((n) => (
          <button key={n._id} type="button" className={`card p-3 mb-2 w-100 text-start ${n.read ? '' : 'notif-unread'}`} onClick={() => open(n)}>
            <div className="d-flex justify-content-between">
              <strong>{n.title}</strong>
              <small className="text-muted">{formatDateTime(n.createdAt)}</small>
            </div>
            <div>{n.message}</div>
            {!n.read && <div className="mt-1"><StatusBadge value="open" /> <small className="text-muted">new</small></div>}
          </button>
        ))
      )}
    </div>
  );
}
