import { Link } from 'react-router-dom';
import { formatINR, roomImage } from '../utils/format';

// search = { checkIn, checkOut, guests } - passed along so the details page is pre-filled
export default function RoomCard({ room, search }) {
  const qs = search?.checkIn && search?.checkOut
    ? `?checkIn=${search.checkIn}&checkOut=${search.checkOut}&guests=${search.guests || 1}`
    : '';
  return (
    <div className="card room-card h-100">
      <img src={roomImage(room)} alt={`Room ${room.roomNumber}`} className="room-img" loading="lazy" />
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start">
          <h5 className="mb-1 text-capitalize">{room.type} room {room.roomNumber}</h5>
          <span className="price">{formatINR(room.pricePerNight)}<small className="text-muted fw-normal"> /night</small></span>
        </div>
        <p className="text-muted small mb-2">Sleeps {room.capacity}</p>
        <div className="mb-3">
          {room.amenities?.slice(0, 4).map((a) => (
            <span key={a} className="badge text-bg-light border me-1 mb-1">{a}</span>
          ))}
        </div>
        <Link to={`/rooms/${room._id}${qs}`} className="btn btn-ink mt-auto">View & book</Link>
      </div>
    </div>
  );
}
