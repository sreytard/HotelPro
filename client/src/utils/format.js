// Currency in Indian rupees
export const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Stay dates are stored as UTC midnight, so display them in UTC
export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : '-';

// Today's date as YYYY-MM-DD in the user's local timezone (for <input type="date" min=...>)
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Best human-readable message from an axios error
export const getErrorMessage = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

export const roomImage = (room) => room?.images?.[0] || `https://picsum.photos/seed/${room?.roomNumber || 'room'}/800/500`;
