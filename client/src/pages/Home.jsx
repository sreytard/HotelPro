import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import RoomCard from '../components/RoomCard';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { todayISO, getErrorMessage } from '../utils/format';

export default function Home() {
  const [filters, setFilters] = useState({ checkIn: '', checkOut: '', guests: 1, type: '' });
  const [search, setSearch] = useState({ checkIn: '', checkOut: '', guests: 1 });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const lastFilters = useRef(filters); // last submitted search, reused for live refresh
  const load = async (f, silent = false) => {
    lastFilters.current = f;
    if (!silent) setLoading(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLiveRefresh(() => load(lastFilters.current, true)); // rooms appear/disappear live when others book

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    if (Boolean(filters.checkIn) !== Boolean(filters.checkOut)) {
      setError('Please select both check-in and check-out dates.');
      return;
    }
    load(filters);
  };

  const datesUsed = search.checkIn && search.checkOut;

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1 className="display-5">Find a room that is free on your dates</h1>
          <p className="fs-5 mb-0">Pick your dates and see only the rooms you can actually book.</p>
        </div>
      </section>

      <div className="container">
        <form className="card search-card p-3 mb-4" onSubmit={onSubmit}>
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
              <button className="btn btn-brass" type="submit">Search rooms</button>
            </div>
          </div>
        </form>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border" role="status" /></div>
        ) : rooms.length === 0 ? (
          <div className="alert alert-warning">
            No rooms are available for these filters. Try different dates or a different room type.
          </div>
        ) : (
          <>
            <p className="text-muted">{rooms.length} room(s) {datesUsed ? 'available for your dates' : 'in the hotel'}</p>
            <div className="row g-4 pb-5">
              {rooms.map((room) => (
                <div className="col-12 col-md-6 col-lg-4" key={room._id}>
                  <RoomCard room={room} search={search} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
