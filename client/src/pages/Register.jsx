import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/format';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 460 }}>
      <form className="card p-4 shadow-sm" onSubmit={submit}>
        <h2 className="mb-3">Create your account</h2>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <label className="form-label" htmlFor="rn">Full name</label>
        <input id="rn" className="form-control mb-3" value={form.name} onChange={set('name')} required />
        <label className="form-label" htmlFor="re">Email</label>
        <input id="re" type="email" className="form-control mb-3" value={form.email} onChange={set('email')} required />
        <label className="form-label" htmlFor="rp">Phone (optional)</label>
        <input id="rp" className="form-control mb-3" value={form.phone} onChange={set('phone')} />
        <label className="form-label" htmlFor="rw">Password (min 6 characters)</label>
        <input id="rw" type="password" className="form-control mb-3" value={form.password} onChange={set('password')} required />
        <button className="btn btn-ink" disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
        <p className="mt-3 mb-0 small">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
