import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useLiveRefresh from '../hooks/useLiveRefresh';
import Stars from '../components/Stars';
import Pager from '../components/Pager';
import { formatDate, formatINR, getErrorMessage, optimizeImg, roomImage, todayISO } from '../utils/format';

export default function RoomDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0); // selected gallery photo
  const [avail, setAvail] = useState({ available: null, bookedRanges: [], quote: null });
  const [reviews, setReviews] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [form, setForm] = useState({
    checkIn: params.get('checkIn') || '',
    checkOut: params.get('checkOut') || '',
    guests: Number(params.get('guests')) || 1,
  });

  const loadRoom = useCallback(() => {
    api.get(`/rooms/${id}`).then((r) => setRoom(r.data)).catch((e) => setError(getErrorMessage(e)));
  }, [id]);

  const loadReviews = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get(`/reviews/room/${id}`, { params: { page, limit: 5 } });
      setReviews(data);
    } catch {
      /* ignore */
    }
  }, [id]);

  // Live availability + seasonal price quote for the chosen dates, and the room's upcoming booked ranges
  const checkAvail = useCallback(async () => {
    try {
      const q = {};
      if (form.checkIn && form.checkOut && new Date(form.checkOut) > new Date(form.checkIn)) {
        q.checkIn = form.checkIn;
        q.checkOut = form.checkOut;
      }
      const { data } = await api.get(`/rooms/${id}/availability`, { params: q });
      setAvail(data);
    } catch {
      setAvail((a) => ({ ...a, available: null, quote: null }));
    }
  }, [id, form.checkIn, form.checkOut]);

  useEffect(() => { loadRoom(); loadReviews(1); }, [loadRoom, loadReviews]);
  useEffect(() => { checkAvail(); }, [checkAvail]);
  // Updates instantly when someone else books this room or a review is added
  useLiveRefresh(() => { checkAvail(); loadRoom(); loadReviews(reviews.page); });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const nights = avail.quote?.nights || 0;
  const seasons = [...new Set((avail.quote?.nightly || []).map((n) => n.rule).filter(Boolean))];

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    if (!form.checkIn || !form.checkOut || new Date(form.checkOut) <= new Date(form.checkIn)) {
      setError('Check-out must be after check-in.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/bookings', { room: room._id, ...form, guests: Number(form.guests) });
      navigate(`/pay/${data._id}`); // next step: payment
    } catch (err) {
      setError(getErrorMessage(err));
      checkAvail();
    } finally {
      setBusy(false);
    }
  };

  if (!room) {
    return (
      <div className="container py-5">
        {error ? <div className="alert alert-danger">{error}</div> : <div className="text-center"><div className="spinner-border" /></div>}
      </div>
    );
  }

  const photos = room.images?.length ? room.images : [roomImage(room)];
  const main = photos[Math.min(active, photos.length - 1)];

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-lg-7">
          <img src={optimizeImg(main, 1100)} alt={`Room ${room.roomNumber}`} className="img-fluid rounded w-100" style={{ maxHeight: 420, objectFit: 'cover' }} />
          {photos.length > 1 && (
            <div className="d-flex gap-2 mt-2 flex-wrap">
              {photos.map((p, i) => (
                <button key={p + i} type="button" className="p-0 border-0 bg-transparent" onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`}>
                  <img src={optimizeImg(p, 200)} alt="" width="84" height="60" className={`rounded ${i === active ? 'border border-2 border-primary' : ''}`} style={{ objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
          <h2 className="mt-3 text-capitalize">{room.type} room {room.roomNumber}</h2>
          <p className="mb-1">{room.ratingCount > 0 ? <Stars value={room.ratingAvg} count={room.ratingCount} size="medium" /> : <span className="text-muted">No reviews yet</span>}</p>
          <p className="text-muted">Sleeps {room.capacity} · from {formatINR(room.pricePerNight)} per night</p>
          <p>{room.description}</p>
          <h6>Amenities</h6>
          <div>{room.amenities.map((a) => <span key={a} className="badge bg-body-secondary text-body border me-1 mb-1">{a}</span>)}</div>

          <h5 className="mt-4">Guest reviews</h5>
          {reviews.items.length === 0 ? (
            <p className="text-muted">No reviews yet. Guests can review a room after their stay.</p>
          ) : (
            <>
              {reviews.items.map((r) => (
                <div key={r._id} className="card p-3 mb-2">
                  <div className="d-flex justify-content-between">
                    <strong>{r.user?.name || 'Guest'}</strong>
                    <small className="text-muted">{formatDate(r.createdAt)}</small>
                  </div>
                  <Stars value={r.rating} />
                  {r.comment && <p className="mb-0 mt-1">{r.comment}</p>}
                </div>
              ))}
              <Pager page={reviews.page} pages={reviews.pages} onChange={loadReviews} />
            </>
          )}
        </div>

        <div className="col-lg-5">
          <form className="card p-4 shadow-sm" onSubmit={submit}>
            <h4>Book this room</h4>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            {room.status !== 'available' && <div className="alert alert-warning py-2">This room is under maintenance.</div>}
            <label className="form-label" htmlFor="rci">Check-in</label>
            <input id="rci" type="date" className="form-control mb-3" min={todayISO()} value={form.checkIn} onChange={set('checkIn')} required />
            <label className="form-label" htmlFor="rco">Check-out</label>
            <input id="rco" type="date" className="form-control mb-3" min={form.checkIn || todayISO()} value={form.checkOut} onChange={set('checkOut')} required />
            <label className="form-label" htmlFor="rgu">Guests (max {room.capacity})</label>
            <input id="rgu" type="number" className="form-control mb-3" min="1" max={room.capacity} value={form.guests} onChange={set('guests')} required />

            {avail.available === true && <div className="alert alert-success py-2">Available for your dates.</div>}
            {avail.available === false && <div className="alert alert-danger py-2">Not available for these dates. Pick other dates or another room.</div>}

            {nights > 0 && (
              <div className="bg-body-tertiary rounded p-3 mb-3">
                <div className="d-flex justify-content-between">
                  <span>{nights} night(s) × about {formatINR(Math.round(avail.quote.total / nights))}</span>
                  <strong>{formatINR(avail.quote.total)}</strong>
                </div>
                {seasons.length > 0 && <small className="text-muted">Includes seasonal pricing: {seasons.join(', ')}</small>}
                <div><small className="text-muted">Taxes included</small></div>
              </div>
            )}
            <button className="btn btn-brass" disabled={busy || room.status !== 'available' || avail.available === false}>
              {busy ? 'Checking availability…' : user ? 'Continue to payment' : 'Log in to book'}
            </button>
            <small className="text-muted mt-2">Your room is held for 30 minutes while you pay.</small>
          </form>

          {avail.bookedRanges.length > 0 && (
            <div className="card p-3 mt-3 shadow-sm">
              <h6 className="mb-2">Already booked (live)</h6>
              <ul className="list-unstyled small mb-0">
                {avail.bookedRanges.map((r, i) => (
                  <li key={i} className="py-1">{formatDate(r.checkIn)} → {formatDate(r.checkOut)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
