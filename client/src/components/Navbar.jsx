import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { setNotifications } from '../store/notificationsSlice';

export default function Navbar() {
  const { user, logout } = useAuth();
  const dispatch = useDispatch();
  const unread = useSelector((state) => state.notifications.unread);
  const [open, setOpen] = useState(false); // mobile menu
  const [menu, setMenu] = useState(null); // which dropdown is open
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-bs-theme') || 'light');
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);
  const isStaff = user && ['staff', 'admin'].includes(user.role);
  const isAdmin = user?.role === 'admin';
  const isHome = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  // Transparent over the hero photo, solid once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Bell: load notifications on login and whenever the server says something changed
  const loadNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications');
      dispatch(setNotifications(data));
    } catch {
      /* ignore */
    }
  };
  useEffect(() => { loadNotifications(); }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  useLiveRefresh(loadNotifications);

  // Close menus on navigation and on outside click
  useEffect(() => { setOpen(false); setMenu(null); }, [location.pathname]);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(null); };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem('hotelpro_theme', next);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const Dropdown = ({ id, label, children }) => (
    <li className="nav-item dropdown">
      <button type="button" className="nav-link dropdown-toggle btn btn-link" onClick={(e) => { e.stopPropagation(); setMenu(menu === id ? null : id); }}>
        {label}
      </button>
      <ul className={`dropdown-menu ${menu === id ? 'show' : ''}`}>{children}</ul>
    </li>
  );
  const Item = ({ to, children }) => <li><NavLink className="dropdown-item" to={to}>{children}</NavLink></li>;

  return (
    <nav className={`navbar navbar-expand-lg navbar-dark navbar-ink ${isHome ? 'nav-fixed' : 'nav-sticky'} ${isHome && !scrolled && !open ? 'nav-clear' : ''}`} ref={ref}>
      <div className="container">
        <Link className="navbar-brand brand fs-4" to="/">HotelPro</Link>
        <button className="navbar-toggler" type="button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><NavLink className="nav-link" to="/" end>Rooms</NavLink></li>
            {user && !isStaff && <li className="nav-item"><NavLink className="nav-link" to="/my-bookings">My bookings</NavLink></li>}
            {user && !isStaff && <li className="nav-item"><NavLink className="nav-link" to="/services">Services</NavLink></li>}
            {isStaff && <li className="nav-item"><NavLink className="nav-link" to="/staff/bookings">Front desk</NavLink></li>}
            {isStaff && <li className="nav-item"><NavLink className="nav-link" to="/staff/requests">Requests</NavLink></li>}
            {isStaff && <li className="nav-item"><NavLink className="nav-link" to="/staff/housekeeping">Housekeeping</NavLink></li>}
            {isStaff && <li className="nav-item"><NavLink className="nav-link" to="/admin/rooms">Manage rooms</NavLink></li>}
            {isAdmin && (
              <Dropdown id="admin" label="Admin">
                <Item to="/admin">Dashboard</Item>
                <Item to="/admin/reports">Reports</Item>
                <Item to="/admin/payments">Payments</Item>
                <Item to="/admin/pricing">Seasonal pricing</Item>
                <Item to="/admin/users">Users</Item>
                <Item to="/admin/audit">Activity log</Item>
                <Item to="/admin/settings">Settings</Item>
              </Dropdown>
            )}
          </ul>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button type="button" className="btn btn-sm btn-outline-light" onClick={toggleTheme} aria-label="Switch light or dark theme">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            {user ? (
              <>
                <Link to="/notifications" className="btn btn-sm btn-outline-light position-relative">
                  Alerts
                  {unread > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{unread}</span>}
                </Link>
                <ul className="navbar-nav">
                  <Dropdown id="me" label={`${user.name} (${user.role})`}>
                    <Item to="/profile">Profile</Item>
                    <li><button type="button" className="dropdown-item" onClick={handleLogout}>Log out</button></li>
                  </Dropdown>
                </ul>
              </>
            ) : (
              <>
                <Link className="btn btn-sm btn-outline-light" to="/login">Log in</Link>
                <Link className="btn btn-sm btn-brass" to="/register">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
