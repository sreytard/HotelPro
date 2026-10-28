import { useEffect, useState } from 'react';
import api from '../api/axios';

const KEY = 'hotelpro_scenes';
const isPlaceholder = (url) => typeof url === 'string' && url.includes('picsum.photos');
let cache = null; // loaded once per visit

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

// Forget the cached photos (called after the admin saves new hero photos)
export const resetScenes = () => {
  cache = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

const build = (settings, rooms) => {
  const hero = (settings?.heroImages || []).filter(Boolean);
  const roomPhotos = rooms.flatMap((room) => room.images || []).filter((u) => u && !isPlaceholder(u));
  return {
    settings,
    rooms,
    scenes: (hero.length ? hero : roomPhotos).slice(0, 6),
    gallery: [...new Set([...hero, ...roomPhotos])].slice(0, 9),
  };
};

// Photos for the animated backgrounds: the admin's hero photos first, otherwise the rooms' own photos.
// The last good result is saved in the browser, so the photos show instantly even while the free server wakes up.
export default function useScenes() {
  const [data, setData] = useState(() => {
    if (cache) return cache;
    const saved = readSaved();
    return { settings: saved?.settings || null, rooms: saved?.rooms || [], scenes: saved?.scenes || [], gallery: saved?.gallery || [] };
  });

  useEffect(() => {
    if (cache) return undefined;
    let alive = true;
    Promise.allSettled([api.get('/settings'), api.get('/rooms')]).then(([s, r]) => {
      if (s.status !== 'fulfilled' && r.status !== 'fulfilled') return; // both failed: keep what we already show
      const saved = readSaved();
      const settings = s.status === 'fulfilled' ? s.value.data : saved?.settings || null;
      const rooms = r.status === 'fulfilled' ? r.value.data : saved?.rooms || [];
      cache = build(settings, rooms);
      try {
        localStorage.setItem(KEY, JSON.stringify(cache));
      } catch {
        /* ignore */
      }
      if (alive) setData(cache);
    });
    return () => { alive = false; };
  }, []);

  return data;
}