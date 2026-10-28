import { useEffect, useState } from 'react';
import api from '../api/axios';

const isPlaceholder = (url) => typeof url === 'string' && url.includes('picsum.photos');
let cache = null; // loaded once per visit

// Forget the cached photos (called after the admin saves new hero photos)
export const resetScenes = () => {
  cache = null;
};

// Photos for the animated backgrounds: the admin's hero photos first, otherwise the rooms' own photos.
// Random placeholder photos are never used, so the site never shows unrelated pictures.
export default function useScenes() {
  const [data, setData] = useState(cache || { settings: null, rooms: [], scenes: [], gallery: [] });

  useEffect(() => {
    if (cache) return undefined;
    let alive = true;
    Promise.all([api.get('/settings'), api.get('/rooms')])
      .then(([s, r]) => {
        const hero = (s.data.heroImages || []).filter(Boolean);
        const roomPhotos = r.data.flatMap((room) => room.images || []).filter((u) => u && !isPlaceholder(u));
        cache = {
          settings: s.data,
          rooms: r.data,
          scenes: (hero.length ? hero : roomPhotos).slice(0, 6),
          gallery: [...new Set([...hero, ...roomPhotos])].slice(0, 9),
        };
        if (alive) setData(cache);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return data;
}
