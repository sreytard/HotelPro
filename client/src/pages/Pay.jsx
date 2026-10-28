import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatINR, getErrorMessage } from '../utils/format';

// Loads Razorpay's checkout script only when it is needed
const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Could not load Razorpay. Check your internet connection.'));
    document.body.appendChild(script);
  });

// Payment page: demo card / UPI / cash (front desk), or Razorpay test mode when the server has keys
export default function Pay() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [config, setConfig] = useState({ razorpay: false });
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api.get(`/bookings/${bookingId}`).then((r) => setBooking(r.data)).catch((e) => setError(getErrorMessage(e)));
    api.get('/payments/config').then((r) => { setConfig(r.data); if (r.data.razorpay) setMethod('razorpay'); }).catch(() => {});
  }, [bookingId]);

  const payWithRazorpay = async () => {
    await loadRazorpay();
    const { data: order } = await api.post(`/payments/${bookingId}/razorpay/order`);
    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'HotelPro',
      description: `Booking ${booking.bookingCode}`,
      prefill: { name: user.name, email: user.email },
      theme: { color: '#12263a' },
      handler: async (response) => {
        try {
          const { data } = await api.post(`/payments/${bookingId}/razorpay/verify`, response);
          setDone(data);
          toast.success('Payment successful');
        } catch (err) {
          setError(getErrorMessage(err));
        } finally {
          setBusy(false);
        }
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    checkout.open();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (method === 'razorpay') {
        await payWithRazorpay(); // busy is cleared by the checkout callbacks
        return;
      }
      const { data } = await api.post(`/payments/${bookingId}`, { method, cardNumber: card.number, upiId });
      setDone(data);
      toast.success('Payment successful');
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  if (!booking) {
    return <div className="container py-5">{error ? <div className="alert alert-danger">{error}</div> : <div className="text-center"><div className="spinner-border" /></div>}</div>;
  }

  if (done) {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <div className="card p-4 text-center shadow-sm">
          <h2>Booking confirmed</h2>
          <div className="bg-body-tertiary rounded p-3 my-3">
            <div className="text-muted small">Your room number</div>
            <div className="stat-value">{booking.room?.roomNumber}</div>
            <div className="small text-capitalize">{booking.room?.type} room · Booking ID <strong>{booking.bookingCode}</strong></div>
          </div>
          <p className="mb-1">Payment of <strong>{formatINR(done.payment.amount)}</strong> received.</p>
          <p className="text-muted small">Transaction ID: {done.payment.transactionId}</p>
          <div className="d-flex gap-2 justify-content-center">
            <Link to="/my-bookings" className="btn btn-ink">View my bookings</Link>
            <Link to={`/invoice/${bookingId}`} className="btn btn-outline-secondary">View invoice</Link>
          </div>
        </div>
      </div>
    );
  }

  const payable = booking.status === 'pending' && booking.paymentStatus !== 'paid';
  const isStaff = ['staff', 'admin'].includes(user.role);
  const methods = [...(config.razorpay ? ['razorpay'] : []), 'card', 'upi', ...(isStaff ? ['cash'] : [])];

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
                {method === 'razorpay'
                  ? 'Razorpay test mode: no real money is charged. Use the test card details shown in the Razorpay window.'
                  : <>Demo mode: no real money is charged. Use card <strong>4242 4242 4242 4242</strong>. A card ending in <strong>0002</strong> is declined.</>}
              </div>
              {error && <div className="alert alert-danger py-2">{error}</div>}

              <div className="btn-group mb-3 flex-wrap" role="group" aria-label="Payment method">
                {methods.map((m) => (
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
              {method === 'razorpay' && <p className="text-muted">A secure Razorpay window will open to complete the payment.</p>}

              <button className="btn btn-brass" disabled={busy}>{busy ? 'Processing…' : `Pay ${formatINR(booking.totalPrice)}`}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
