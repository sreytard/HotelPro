import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/format';

// Opened from the link in the verification email
export default function VerifyEmail() {
  const { token } = useParams();
  const { user, updateUser } = useAuth();
  const [state, setState] = useState({ status: 'loading', message: '' });
  const called = useRef(false); // the token works once, so never call twice (React StrictMode runs effects twice in development)

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    api.post('/auth/verify-email', { token })
      .then((r) => {
        setState({ status: 'ok', message: r.data.message });
        if (user) updateUser({ emailVerified: true });
      })
      .catch((err) => setState({ status: 'error', message: getErrorMessage(err) }));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container py-5 text-center" style={{ maxWidth: 520 }}>
      {state.status === 'loading' && <div className="spinner-border" role="status" />}
      {state.status === 'ok' && <div className="alert alert-success"><h4>Email verified</h4>{state.message}</div>}
      {state.status === 'error' && <div className="alert alert-danger"><h4>Could not verify</h4>{state.message}</div>}
      {state.status !== 'loading' && <Link to="/" className="btn btn-ink">Go to HotelPro</Link>}
    </div>
  );
}
