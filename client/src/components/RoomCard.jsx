import { Link } from 'react-router-dom';
import Stars from './Stars';
import { formatINR, roomImage } from '../utils/format';

// search = { checkIn, checkOut, guests } - passed along so the details page is pre-filled
export default function RoomCard({ room, search }) {
  const qs = search?.checkIn && search?.checkOut
    ? `?checkIn=${search.checkIn}&checkOut=${search.checkOut}&guests=${search.guests || 1}`
    : '';
  return (
    <div className="card room-card h-100">
      <div className="room-img-wrap">
        <img src={roomImage(room, 700)} alt={`Room ${room.roomNumber}`} className="room-img" loading="lazy" />
        <span className="price-tag">{formatINR(room.pricePerNight)}<small> / night</small></span>
      </div>
      <div className="card-body d-flex flex-column">
        <h5 className="mb-1 text-capitalize">{room.type} room {room.roomNumber}</h5>
        <p className="text-muted small mb-1">Sleeps {room.capacity}</p>
        <div className="mb-2">
          {room.ratingCount > 0
            ? <Stars value={room.ratingAvg} count={room.ratingCount} />
            : <small className="text-muted">No reviews yet</small>}
        </div>
        <div className="mb-3">
          {room.amenities?.slice(0, 4).map((a) => (
            <span key={a} className="badge bg-body-secondary text-body border me-1 mb-1">{a}</span>
          ))}
        </div>
        <Link to={`/rooms/${room._id}${qs}`} className="btn btn-ink mt-auto">View & book</Link>
      </div>
    </div>
  );
}
