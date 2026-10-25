import { useEffect, useRef } from 'react';
import { socket } from '../api/socket';

// Calls `callback` whenever the server reports a booking/room change.
// Used to keep availability, bookings and the dashboard up to date without reloading.
export default function useLiveRefresh(callback) {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    let timer;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => ref.current(), 300); // merge bursts of events
    };
    socket.on('hotel:changed', handler);
    return () => {
      clearTimeout(timer);
      socket.off('hotel:changed', handler);
    };
  }, []);
}
