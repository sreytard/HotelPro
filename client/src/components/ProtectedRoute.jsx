import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Blocks pages for logged-out users and for roles that are not allowed
export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container py-5 text-center">
        <h2>Access denied</h2>
        <p className="text-muted">Your role ({user.role}) cannot open this page.</p>
      </div>
    );
  }
  return children;
}
