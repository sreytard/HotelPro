import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import RoomCard from '../components/RoomCard';
import Pager from '../components/Pager';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import Stars from '../components/Stars';
import SceneBackground from '../components/SceneBackground';
import useLiveRefresh from '../hooks/useLiveRefresh';
import useScenes from '../hooks/useScenes';
import { useAuth } from '../context/AuthContext';
import { formatDate, getErrorMessage, optimizeImg, todayISO } from '../utils/format';

const PAGE_SIZE = 6;

export default function Home() {
  const { user } = useAuth();
  const { settings, rooms: allRooms, scenes, gallery } = useScenes();

  const [filters, setFilters] = useState({ checkIn: '', checkOut: '', guests: 1, type: '' });
  const [search, setSearch] = useState({ checkIn: '', checkOut: '', guests: 1 });
  const [rooms, setRooms] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [sceneIdx, setSceneIdx] = useState(0); // which section is on screen -> which background photo
  const [tick, setTick] = useState(0); // slow automatic rotation while the hero is on screen
  const lastFilters = useRef(filters); // last submitted search, reused for live refresh

  const load = async (f, silent = false) => {
    lastFilters.current = f;
    if (!silent) {
      setLoading(true);
      setPage(1);
    }
    setError('');
    try {
      const params = { guests: f.guests };
      if (f.type) params.type = f.type;
      if (f.checkIn && f.checkOut) {
        params.checkIn = f.checkIn;
        params.checkOut = f.checkOut;
      }
      const { data } = await api.get('/rooms', { params });
      setRooms(data);
      setSearch({ checkIn: f.checkIn, checkOut: f.checkOut, guests: f.guests });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filters);
    api.get('/reviews/latest').then((r) => setReviews(r.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLiveRefresh(() => load(lastFilters.current, true)); // rooms appear/disappear live when others book

  // Background photo follows the section that is in the middle of the screen
  useEffect(() => {
    const els = document.querySelectorAll('[data-scene]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setSceneIdx(Number(e.target.dataset.scene)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loading, reviews.length, gallery.length]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 7000);
    return () => clearInterval(t);
  }, []);

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    if (Boolean(filters.checkIn) !== Boolean(filters.checkOut)) {
      setError('Please select both check-in and check-out dates.');
      return;
    }
    load(filters).then(() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' }));
  };

  // Real numbers from the hotel's own data
  const stats = useMemo(() => {
    const reviewCount = allRooms.reduce((s, r) => s + (r.ratingCount || 0), 0);
    const rating = reviewCount ? allRooms.reduce((s, r) => s + r.ratingAvg * (r.ratingCount || 0), 0) / reviewCount : 0;
    const freq = {};
    allRooms.forEach((r) => (r.amenities || []).forEach((a) => { freq[a] = (freq[a] || 0) + 1; }));
    const amenities = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { reviewCount, rating, amenities };
  }, [allRooms]);

  const datesUsed = search.checkIn && search.checkOut;
  const visible = rooms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hotelName = settings?.hotelName || 'HotelPro';

  return (
    <div className="home">
      <SceneBackground images={scenes} index={sceneIdx === 0 ? tick : sceneIdx} />

      {/* ---------- Hero ---------- */}
      <section className="hero-full" data-scene="0">
        <div className="container hero-inner">
          <p className="eyebrow">{hotelName}</p>
          <h1 className="display-title">Stay somewhere you will remember</h1>
          <p className="hero-lead">Comfortable rooms, live availability and instant confirmation. Pick your dates and see only what is free.</p>

          <form className="glass-light search-card" onSubmit={onSubmit}>
            <div className="row g-3 align-items-end">
              <div className="col-6 col-md-3">
                <label className="form-label" htmlFor="ci">Check-in</label>
                <input id="ci" type="date" className="form-control" min={todayISO()} value={filters.checkIn} onChange={set('checkIn')} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label" htmlFor="co">Check-out</label>
                <input id="co" type="date" className="form-control" min={filters.checkIn || todayISO()} value={filters.checkOut} onChange={set('checkOut')} />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label" htmlFor="gu">Guests</label>
                <input id="gu" type="number" min="1" max="10" className="form-control" value={filters.guests} onChange={set('guests')} />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label" htmlFor="ty">Room type</label>
                <select id="ty" className="form-select" value={filters.type} onChange={set('type')}>
                  <option value="">Any</option>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="deluxe">Deluxe</option>
                  <option value="suite">Suite</option>
                </select>
              </div>
              <div className="col-12 col-md-2 d-grid">
                <button className="btn btn-brass" type="submit">Search</button>
              </div>
            </div>
          </form>
        </div>
        <a href="#rooms" className="scroll-cue" aria-label="Scroll to rooms"><span /></a>
      </section>

      {/* ---------- Rooms ---------- */}
      <section id="rooms" className="section" data-scene="1">
        <div className="container">
          <Reveal>
            <p className="eyebrow">Rooms & suites</p>
            <h2 className="section-title">{datesUsed ? 'Available for your dates' : 'Find your room'}</h2>
            {!loading && rooms.length > 0 && <p className="section-sub">{rooms.length} room(s) {datesUsed ? 'free on your dates' : 'in the hotel'}. Availability updates live.</p>}
          </Reveal>

          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-light" role="status" /></div>
          ) : rooms.length === 0 ? (
            <div className="alert alert-warning">No rooms are available for these filters. Try different dates or a different room type.</div>
          ) : (
            <>
              <div className="row g-4 mt-1">
                {visible.map((room, i) => (
                  <div className="col-12 col-md-6 col-lg-4" key={room._id}>
                    <Reveal delay={i * 70} className="h-100"><RoomCard room={room} search={search} /></Reveal>
                  </div>
                ))}
              </div>
              <div className="d-flex justify-content-center mt-3">
                <div className="glass-light rounded-pill px-2"><Pager page={page} pages={Math.ceil(rooms.length / PAGE_SIZE)} onChange={setPage} /></div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------- Experience ---------- */}
      <section className="section" data-scene="2">
        <div className="container">
          <Reveal>
            <p className="eyebrow">The experience</p>
            <h2 className="section-title">Everything for a comfortable stay</h2>
          </Reveal>
          <div className="row g-4 mt-1">
            <div className="col-lg-5">
              <div className="row g-3">
                <div className="col-6"><Reveal><div className="glass stat-tile"><div className="stat-big"><CountUp to={allRooms.length} /></div><div>Rooms & suites</div></div></Reveal></div>
                <div className="col-6"><Reveal delay={80}><div className="glass stat-tile"><div className="stat-big">{stats.reviewCount ? <CountUp to={stats.rating} decimals={1} /> : 'New'}</div><div>Guest rating</div></div></Reveal></div>
                <div className="col-12"><Reveal delay={160}><div className="glass stat-tile"><div className="stat-big"><CountUp to={stats.reviewCount} /></div><div>Guest reviews</div></div></Reveal></div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="row g-3">
                {stats.amenities.map(([name, count], i) => (
                  <div className="col-sm-6" key={name}>
                    <Reveal delay={i * 80} className="h-100">
                      <div className="glass amenity-tile h-100">
                        <span className="amenity-dot">{name.charAt(0)}</span>
                        <div><strong>{name}</strong><div className="small opacity-75">in {count} of {allRooms.length} rooms</div></div>
                      </div>
                    </Reveal>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {settings && (
            <Reveal>
              <div className="glass p-4 mt-4 d-flex flex-wrap justify-content-between gap-3">
                <div><div className="small opacity-75">Address</div>{settings.address}</div>
                <div><div className="small opacity-75">Check-in from</div>{settings.checkInTime}</div>
                <div><div className="small opacity-75">Check-out by</div>{settings.checkOutTime}</div>
                <div><div className="small opacity-75">Reservations</div>{settings.phone}</div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ---------- Gallery (needs at least 3 real photos) ---------- */}
      {gallery.length >= 3 && (
        <section className="section" data-scene="3">
          <div className="container">
            <Reveal>
              <p className="eyebrow">Gallery</p>
              <h2 className="section-title">A look around</h2>
            </Reveal>
            <div className="gallery-grid mt-3">
              {gallery.map((src, i) => (
                <Reveal key={src} delay={i * 60} className="g-item">
                  <img src={optimizeImg(src, 900)} alt={`Hotel photo ${i + 1}`} loading="lazy" />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Guest reviews ---------- */}
      {reviews.length > 0 && (
        <section className="section" data-scene="4">
          <div className="container">
            <Reveal>
              <p className="eyebrow">Guest reviews</p>
              <h2 className="section-title">What guests say</h2>
            </Reveal>
            <div className="row g-4 mt-1">
              {reviews.map((r, i) => (
                <div className="col-md-6 col-lg-4" key={r._id}>
                  <Reveal delay={i * 70} className="h-100">
                    <div className="glass p-4 h-100">
                      <Stars value={r.rating} />
                      <p className="mt-2 mb-3">“{r.comment}”</p>
                      <div className="small opacity-75">{r.user?.name || 'Guest'} · Room {r.room?.roomNumber} · {formatDate(r.createdAt)}</div>
                    </div>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Call to action ---------- */}
      <section className="section cta-band">
        <div className="container text-center">
          <Reveal>
            <h2 className="section-title">Ready for your stay?</h2>
            <p className="section-sub">Pick your dates, choose a room and confirm in a minute.</p>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              <button className="btn btn-brass btn-lg" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Check availability</button>
              {!user && <Link to="/register" className="btn btn-outline-light btn-lg">Create an account</Link>}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
