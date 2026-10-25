import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const readStored = () => {
  try {
    return JSON.parse(localStorage.getItem('hotelpro_user'));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStored());

  const save = (data) => {
    localStorage.setItem('hotelpro_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const login = async (email, password) => save((await api.post('/auth/login', { email, password })).data);
  const register = async (payload) => save((await api.post('/auth/register', payload)).data);
  const logout = () => {
    localStorage.removeItem('hotelpro_user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
