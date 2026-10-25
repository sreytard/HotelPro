import axios from 'axios';

// Dev: '/api' (Vite proxy). Production: VITE_API_URL (set on Vercel).
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  try {
    const stored = JSON.parse(localStorage.getItem('hotelpro_user'));
    if (stored?.token) config.headers.Authorization = `Bearer ${stored.token}`;
  } catch {
    /* ignore corrupted storage */
  }
  return config;
});

// Expired / invalid token -> log out and go to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('hotelpro_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
