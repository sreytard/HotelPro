import { createSlice } from '@reduxjs/toolkit';

// The logged-in user (incl. JWT) is kept in Redux and mirrored to localStorage so a refresh keeps you logged in
const read = () => {
  try {
    return JSON.parse(localStorage.getItem('hotelpro_user'));
  } catch {
    return null;
  }
};
const persist = (user) => {
  if (user) localStorage.setItem('hotelpro_user', JSON.stringify(user));
  else localStorage.removeItem('hotelpro_user');
};

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: read() },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      persist(state.user);
    },
    patchUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      persist(state.user);
    },
    clearUser(state) {
      state.user = null;
      persist(null);
    },
  },
});

export const { setUser, patchUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
