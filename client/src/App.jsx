import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import RoomDetails from './pages/RoomDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import Pay from './pages/Pay';
import StaffBookings from './pages/StaffBookings';
import AdminDashboard from './pages/AdminDashboard';
import ManageRooms from './pages/ManageRooms';
import ManageUsers from './pages/ManageUsers';

const NotFound = () => (
  <div className="container py-5 text-center">
    <h2>Page not found</h2>
    <Link to="/" className="btn btn-ink mt-3">Back to rooms</Link>
  </div>
);

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rooms/:id" element={<RoomDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* any logged-in user */}
        <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
        <Route path="/pay/:bookingId" element={<ProtectedRoute><Pay /></ProtectedRoute>} />

        {/* staff + admin */}
        <Route path="/staff/bookings" element={<ProtectedRoute roles={['staff', 'admin']}><StaffBookings /></ProtectedRoute>} />
        <Route path="/admin/rooms" element={<ProtectedRoute roles={['staff', 'admin']}><ManageRooms /></ProtectedRoute>} />

        {/* admin only */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><ManageUsers /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
