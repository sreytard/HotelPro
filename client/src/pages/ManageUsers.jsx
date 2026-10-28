import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Pager from '../components/Pager';
import { formatDate, getErrorMessage } from '../utils/format';

// Admin: all users (search, filter, pagination) and staff account creation
export default function ManageUsers() {
  const { user: me } = useAuth();
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/admin/users', { params: { page, limit: 10, ...(role ? { role } : {}), ...(search ? { q: search } : {}) } });
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [page, role, search]);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', form);
      toast.success(`${form.role} account created for ${form.email}.`);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}?`)) return;
    try {
      await api.delete(`/admin/users/${u._id}`);
      toast.success('User deleted.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Users</h2>

      <form className="card p-3 shadow-sm mb-4" onSubmit={submit}>
        <h5>Add staff account</h5>
        <div className="row g-3 align-items-end">
          <div className="col-md-3"><label className="form-label" htmlFor="un">Name</label><input id="un" className="form-control" value={form.name} onChange={set('name')} required /></div>
          <div className="col-md-3"><label className="form-label" htmlFor="ue">Email</label><input id="ue" type="email" className="form-control" value={form.email} onChange={set('email')} required /></div>
          <div className="col-md-2"><label className="form-label" htmlFor="up">Password (8+)</label><input id="up" type="password" minLength={8} className="form-control" value={form.password} onChange={set('password')} required /></div>
          <div className="col-md-2">
            <label className="form-label" htmlFor="ur">Role</label>
            <select id="ur" className="form-select" value={form.role} onChange={set('role')}><option value="staff">Staff</option><option value="admin">Admin</option></select>
          </div>
          <div className="col-md-2 d-grid"><button className="btn btn-brass">Create</button></div>
        </div>
      </form>

      <form className="d-flex flex-wrap gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
        <select className="form-select w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Filter by role">
          <option value="">All roles</option><option value="guest">Guests</option><option value="staff">Staff</option><option value="admin">Admins</option>
        </select>
        <input className="form-control w-auto" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        <button className="btn btn-ink">Search</button>
      </form>

      <div className="table-responsive card shadow-sm">
        <table className="table mb-0">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Joined</th><th /></tr></thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`badge text-bg-${u.role === 'admin' ? 'dark' : u.role === 'staff' ? 'primary' : 'secondary'}`}>{u.role}</span></td>
                <td>{u.emailVerified === false ? <span className="text-warning-emphasis">no</span> : 'yes'}</td>
                <td>{formatDate(u.createdAt)}</td>
                <td className="text-end">{u._id !== me._id && <button className="btn btn-sm btn-outline-danger" onClick={() => remove(u)}>Delete</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small text-muted mt-2">{data.total} users</div>
      <Pager page={data.page} pages={data.pages} onChange={setPage} />
    </div>
  );
}
