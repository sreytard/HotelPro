import { lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy loading + code splitting: every page is downloaded only when it is opened
const Home = lazy(() => import('./pages/Home'));
const RoomDetails = lazy(() => import('./pages/RoomDetails'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Services = lazy(() => import('./pages/Services'));
const Pay = lazy(() => import('./pages/Pay'));
const Invoice = lazy(() => import('./pages/Invoice'));
const StaffBookings = lazy(() => import('./pages/StaffBookings'));
const Requests = lazy(() => import('./pages/Requests'));
const Housekeeping = lazy(() => import('./pages/Housekeeping'));
const ManageRooms = lazy(() => import('./pages/ManageRooms'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const Payments = lazy(() => import('./pages/Payments'));
const SeasonalPricing = lazy(() => import('./pages/SeasonalPricing'));
const ManageUsers = lazy(() => import('./pages/ManageUsers'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Settings = lazy(() => import('./pages/Settings'));

const NotFound = () => (
  <div className="container py-5 text-center">
    <h2>Page not found</h2>
    <Link to="/" className="btn btn-ink mt-3">Back to rooms</Link>
  </div>
);

const Loading = () => <div className="text-center py-5"><div className="spinner-border" role="status" /></div>;

const staff = ['staff', 'admin'];
const admin = ['admin'];
const guarded = (element, roles) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

export default function App() {
  const location = useLocation();
  return (
    <>
      <Navbar />
      <main key={location.pathname} className="page-fade">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rooms/:id" element={<RoomDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />

            {/* any logged-in user */}
            <Route path="/profile" element={guarded(<Profile />)} />
            <Route path="/notifications" element={guarded(<Notifications />)} />
            <Route path="/my-bookings" element={guarded(<MyBookings />)} />
            <Route path="/services" element={guarded(<Services />)} />
            <Route path="/pay/:bookingId" element={guarded(<Pay />)} />
            <Route path="/invoice/:bookingId" element={guarded(<Invoice />)} />

            {/* staff + admin */}
            <Route path="/staff/bookings" element={guarded(<StaffBookings />, staff)} />
            <Route path="/staff/requests" element={guarded(<Requests />, staff)} />
            <Route path="/staff/housekeeping" element={guarded(<Housekeeping />, staff)} />
            <Route path="/admin/rooms" element={guarded(<ManageRooms />, staff)} />

            {/* admin only */}
            <Route path="/admin" element={guarded(<AdminDashboard />, admin)} />
            <Route path="/admin/reports" element={guarded(<Reports />, admin)} />
            <Route path="/admin/payments" element={guarded(<Payments />, admin)} />
            <Route path="/admin/pricing" element={guarded(<SeasonalPricing />, admin)} />
            <Route path="/admin/users" element={guarded(<ManageUsers />, admin)} />
            <Route path="/admin/audit" element={guarded(<AuditLog />, admin)} />
            <Route path="/admin/settings" element={guarded(<Settings />, admin)} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <ToastContainer position="top-right" autoClose={3500} theme="colored" />
    </>
  );
}
