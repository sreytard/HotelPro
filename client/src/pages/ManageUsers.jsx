import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDate, getErrorMessage } from '../utils/format';

// Admin: see all users and create staff accounts
export default function ManageUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.post('/admin/users', form);
      setMessage(`${form.role} account created for ${form.email}.`);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}?`)) return;
    setError(''); setMessage('');
    try {
      await api.delete(`/admin/users/${u._id}`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Users</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="card p-3 shadow-sm mb-4" onSubmit={submit}>
        <h5>Add staff account</h5>
        <div className="row g-3 align-items-end">
          <div className="col-md-3"><label className="form-label" htmlFor="un">Name</label><input id="un" className="form-control" value={form.name} onChange={set('name')} required /></div>
          <div className="col-md-3"><label className="form-label" htmlFor="ue">Email</label><input id="ue" type="email" className="form-control" value={form.email} onChange={set('email')} required /></div>
          <div className="col-md-2"><label className="form-label" htmlFor="up">Password</label><input id="up" type="password" minLength={6} className="form-control" value={form.password} onChange={set('password')} required /></div>
          <div className="col-md-2">
            <label className="form-label" htmlFor="ur">Role</label>
            <select id="ur" className="form-select" value={form.role} onChange={set('role')}><option value="staff">Staff</option><option value="admin">Admin</option></select>
          </div>
          <div className="col-md-2 d-grid"><button className="btn btn-brass">Create</button></div>
        </div>
      </form>

      <div className="table-responsive card shadow-sm">
        <table className="table mb-0">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`badge text-bg-${u.role === 'admin' ? 'dark' : u.role === 'staff' ? 'primary' : 'secondary'}`}>{u.role}</span></td>
                <td>{formatDate(u.createdAt)}</td>
                <td className="text-end">{u._id !== me._id && <button className="btn btn-sm btn-outline-danger" onClick={() => remove(u)}>Delete</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
