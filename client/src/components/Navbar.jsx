import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isStaff = user && ['staff', 'admin'].includes(user.role);
  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-ink">
      <div className="container">
        <Link className="navbar-brand brand fs-4" to="/" onClick={close}>HotelPro</Link>
        <button className="navbar-toggler" type="button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><NavLink className="nav-link" to="/" end onClick={close}>Rooms</NavLink></li>
            {user && <li className="nav-item"><NavLink className="nav-link" to="/my-bookings" onClick={close}>My bookings</NavLink></li>}
            {isStaff && <li className="nav-item"><NavLink className="nav-link" to="/staff/bookings" onClick={close}>Front desk</NavLink></li>}
            {isStaff && <li className="nav-item"><NavLink className="nav-link" to="/admin/rooms" onClick={close}>Manage rooms</NavLink></li>}
            {user?.role === 'admin' && <li className="nav-item"><NavLink className="nav-link" to="/admin" end onClick={close}>Dashboard</NavLink></li>}
            {user?.role === 'admin' && <li className="nav-item"><NavLink className="nav-link" to="/admin/users" onClick={close}>Users</NavLink></li>}
          </ul>
          <div className="d-flex align-items-center gap-2">
            {user ? (
              <>
                <span className="text-white-50 small">{user.name} ({user.role})</span>
                <button className="btn btn-sm btn-outline-light" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <Link className="btn btn-sm btn-outline-light" to="/login" onClick={close}>Log in</Link>
                <Link className="btn btn-sm btn-brass" to="/register" onClick={close}>Sign up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
