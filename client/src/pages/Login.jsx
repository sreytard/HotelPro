import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/format';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      const fallback = user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff/bookings' : '/';
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const fill = (email, password) => setForm({ email, password });

  return (
    <div className="container py-5" style={{ maxWidth: 460 }}>
      <form className="card p-4 shadow-sm" onSubmit={submit}>
        <h2 className="mb-3">Log in</h2>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <label className="form-label" htmlFor="em">Email</label>
        <input id="em" type="email" className="form-control mb-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label className="form-label" htmlFor="pw">Password</label>
        <input id="pw" type="password" className="form-control mb-3" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button className="btn btn-ink" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="mt-3 mb-0 small">New here? <Link to="/register">Create an account</Link></p>
      </form>

      <div className="card p-3 mt-3 small">
        <strong className="mb-2">Try it as a guest</strong>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => fill('guest@hotelpro.com', 'Guest@123')}>Fill demo guest login</button>
        </div>
        <div className="text-muted mt-2">Staff and admin logins are private. Ask the project owner for access.</div>
      </div>
    </div>
  );
}
