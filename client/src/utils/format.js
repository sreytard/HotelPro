// Currency in Indian rupees
export const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Stay dates are stored as UTC midnight, so display them in UTC
export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : '-';

// Date and time for log entries and notifications (local time)
export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

// Today's date as YYYY-MM-DD in the user's local timezone (for <input type="date" min=...>)
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// YYYY-MM-DD of a stored date
export const toISO = (d) => new Date(d).toISOString().slice(0, 10);

// Best human-readable message from an axios error
export const getErrorMessage = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

// Image optimization: Cloudinary photos are delivered resized, compressed and in the best format (WebP/AVIF)
export const optimizeImg = (url, width = 800) =>
  typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/f_auto')
    ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    : url;

export const roomImage = (room, width = 800) =>
  optimizeImg(room?.images?.[0] || `https://picsum.photos/seed/${room?.roomNumber || 'room'}/800/500`, width);
