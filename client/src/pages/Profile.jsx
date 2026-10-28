import { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/format';

// Profile management: name, phone, password and email verification
export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const resend = async () => {
    try {
      await api.post('/auth/resend-verification');
      toast.success('Verification email sent. Please check your inbox.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 560 }}>
      <h2 className="mb-3">My profile</h2>

      <form className="card p-4 shadow-sm mb-4" onSubmit={saveProfile}>
        <label className="form-label" htmlFor="pe">Email</label>
        <input id="pe" className="form-control mb-1" value={user.email} disabled />
        <div className="mb-3 small">
          {user.emailVerified
            ? <span className="text-success">Email verified</span>
            : <span className="text-warning-emphasis">Email not verified. <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={resend}>Resend verification email</button></span>}
        </div>
        <label className="form-label" htmlFor="pn">Full name</label>
        <input id="pn" className="form-control mb-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} />
        <label className="form-label" htmlFor="pp">Phone</label>
        <input id="pp" className="form-control mb-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
        <button className="btn btn-ink">Save profile</button>
      </form>

      <form className="card p-4 shadow-sm" onSubmit={savePassword}>
        <h5>Change password</h5>
        <label className="form-label" htmlFor="pc">Current password</label>
        <input id="pc" type="password" className="form-control mb-3" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
        <label className="form-label" htmlFor="pnw">New password (min 8 characters)</label>
        <input id="pnw" type="password" className="form-control mb-3" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={8} />
        <button className="btn btn-ink">Change password</button>
      </form>
    </div>
  );
}
