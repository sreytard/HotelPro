import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatINR, getErrorMessage } from '../utils/format';

// MOCK payment page - no real money moves
export default function Pay() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api.get(`/bookings/${bookingId}`).then((r) => setBooking(r.data)).catch((e) => setError(getErrorMessage(e)));
  }, [bookingId]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post(`/payments/${bookingId}`, { method, cardNumber: card.number, upiId });
      setDone(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!booking) {
    return <div className="container py-5">{error ? <div className="alert alert-danger">{error}</div> : <div className="text-center"><div className="spinner-border" /></div>}</div>;
  }

  if (done) {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <div className="card p-4 text-center shadow-sm">
          <h2>Booking confirmed</h2>
          <div className="bg-light rounded p-3 my-3">
            <div className="text-muted small">Your room number</div>
            <div className="stat-value">{booking.room?.roomNumber}</div>
            <div className="small text-capitalize">{booking.room?.type} room · Booking ID <strong>{booking.bookingCode}</strong></div>
          </div>
          <p className="mb-1">Payment of <strong>{formatINR(done.payment.amount)}</strong> received.</p>
          <p className="text-muted small">Transaction ID: {done.payment.transactionId}</p>
          <Link to="/my-bookings" className="btn btn-ink">View my bookings</Link>
        </div>
      </div>
    );
  }

  const payable = booking.status === 'pending' && booking.paymentStatus !== 'paid';
  const isStaff = ['staff', 'admin'].includes(user.role);

  return (
    <div className="container py-4" style={{ maxWidth: 820 }}>
      <div className="row g-4">
        <div className="col-md-5">
          <div className="card p-3 shadow-sm">
            <h5 className="text-capitalize">{booking.room?.type} room {booking.room?.roomNumber}</h5>
            <p className="mb-1 small">{formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}</p>
            <p className="mb-1 small">{booking.nights} night(s) · {booking.guests} guest(s)</p>
            <hr />
            <div className="d-flex justify-content-between"><span>Total</span><strong>{formatINR(booking.totalPrice)}</strong></div>
          </div>
        </div>

        <div className="col-md-7">
          {!payable ? (
            <div className="alert alert-info">
              This booking is <strong>{booking.status}</strong> and is not awaiting payment.
              <div className="mt-2"><Link to="/my-bookings">Go to my bookings</Link></div>
            </div>
          ) : (
            <form className="card p-4 shadow-sm" onSubmit={submit}>
              <h4>Payment</h4>
              <div className="alert alert-secondary py-2 small">
                Demo mode: no real money is charged. Use card <strong>4242 4242 4242 4242</strong>. A card ending in <strong>0002</strong> is declined.
              </div>
              {error && <div className="alert alert-danger py-2">{error}</div>}

              <div className="btn-group mb-3" role="group" aria-label="Payment method">
                {['card', 'upi', ...(isStaff ? ['cash'] : [])].map((m) => (
                  <button key={m} type="button" className={`btn ${method === m ? 'btn-ink' : 'btn-outline-secondary'} text-uppercase`} onClick={() => setMethod(m)}>{m}</button>
                ))}
              </div>

              {method === 'card' && (
                <>
                  <label className="form-label" htmlFor="cn">Card number</label>
                  <input id="cn" className="form-control mb-3" inputMode="numeric" maxLength={19} placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
                  <label className="form-label" htmlFor="cname">Name on card</label>
                  <input id="cname" className="form-control mb-3" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                  <div className="row">
                    <div className="col-6"><label className="form-label" htmlFor="cex">Expiry</label><input id="cex" className="form-control mb-3" placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} /></div>
                    <div className="col-6"><label className="form-label" htmlFor="ccv">CVV</label><input id="ccv" type="password" maxLength={4} className="form-control mb-3" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} /></div>
                  </div>
                </>
              )}
              {method === 'upi' && (
                <>
                  <label className="form-label" htmlFor="upi">UPI ID</label>
                  <input id="upi" className="form-control mb-3" placeholder="name@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                </>
              )}
              {method === 'cash' && <p className="text-muted">Mark the amount as collected at the front desk.</p>}

              <button className="btn btn-brass" disabled={busy}>{busy ? 'Processing…' : `Pay ${formatINR(booking.totalPrice)}`}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
