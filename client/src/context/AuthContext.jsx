import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios';
import { setUser, patchUser, clearUser } from '../store/authSlice';
import { clearNotifications } from '../store/notificationsSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    dispatch(setUser(data));
    return data;
  };
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    dispatch(setUser(data));
    return data;
  };
  const logout = () => {
    dispatch(clearUser());
    dispatch(clearNotifications());
  };
  const updateUser = (changes) => dispatch(patchUser(changes));

  return { user, login, register, logout, updateUser };
};

// Kept so older imports still work; the Redux <Provider> in main.jsx does the real work now
export const AuthProvider = ({ children }) => children;
