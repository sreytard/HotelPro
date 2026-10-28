import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import Pager from '../components/Pager';
import { formatDateTime, formatINR, getErrorMessage } from '../utils/format';

// Admin: payment tracking
export default function Payments() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/payments', { params: { page, limit: 10, ...(status ? { status } : {}) } });
      setData(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;
  const { summary } = data;

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h2 className="mb-0">Payments</h2>
        <select className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All payments</option><option value="success">Successful</option><option value="refunded">Refunded</option><option value="failed">Failed</option>
        </select>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4"><div className="card p-3 shadow-sm"><div className="text-muted small">Collected</div><div className="stat-value">{formatINR(summary.success.total)}</div><div className="small text-muted">{summary.success.count} payments</div></div></div>
        <div className="col-md-4"><div className="card p-3 shadow-sm"><div className="text-muted small">Refunded</div><div className="stat-value">{formatINR(summary.refunded.total)}</div><div className="small text-muted">{summary.refunded.count} payments</div></div></div>
        <div className="col-md-4"><div className="card p-3 shadow-sm"><div className="text-muted small">Failed attempts</div><div className="stat-value">{summary.failed.count}</div><div className="small text-muted">{formatINR(summary.failed.total)} not collected</div></div></div>
      </div>

      <div className="table-responsive card shadow-sm">
        <table className="table mb-0">
          <thead><tr><th>Date</th><th>Guest</th><th>Method</th><th>Transaction</th><th>Status</th><th className="text-end">Amount</th></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan="6" className="text-muted">No payments found.</td></tr>}
            {data.items.map((p) => (
              <tr key={p._id}>
                <td className="text-nowrap">{formatDateTime(p.createdAt)}</td>
                <td>{p.user?.name || 'Deleted user'}<div className="small text-muted">{p.user?.email}</div></td>
                <td className="text-uppercase">{p.method}{p.last4 ? ` ····${p.last4}` : ''}</td>
                <td className="small">{p.transactionId}</td>
                <td><StatusBadge value={p.status} /></td>
                <td className="text-end">{formatINR(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={data.page} pages={data.pages} onChange={setPage} />
    </div>
  );
}
