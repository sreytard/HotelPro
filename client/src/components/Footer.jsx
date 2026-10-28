import { useEffect, useState } from 'react';
import api from '../api/axios';

// Hotel contact details come from the admin's Settings page
export default function Footer() {
  const [s, setS] = useState(null);
  useEffect(() => {
    api.get('/settings').then((r) => setS(r.data)).catch(() => {});
  }, []);
  return (
    <footer className="site-footer py-5 text-center small">
      <div className="container">
        <div className="brand mb-1">{s?.hotelName || 'HotelPro'}</div>
        {s && <div>{s.address} · {s.phone} · {s.email}</div>}
        {s && <div>Check-in {s.checkInTime} · Check-out {s.checkOutTime}</div>}
      </div>
    </footer>
  );
}
