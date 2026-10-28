import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

axios.defaults.baseURL = '/api';
axios.defaults.withCredentials = true;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await axios.get('/auth/me');
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    document.body.dataset.theme = user?.preferences?.theme || 'light';
  }, [user]);

  const login = async (credentials) => {
    const { data } = await axios.post('/auth/login', credentials);
    setUser(data.user);
    return data;
  };

  const register = async (payload) => {
    const { data } = await axios.post('/auth/register', payload);
    setUser(data.user);
    return data;
  };

  const updateProfile = async (payload) => {
    const { data } = await axios.put('/auth/profile', payload);
    setUser(data.user);
    return data;
  };

  const changePassword = async (payload) => {
    const { data } = await axios.put('/auth/change-password', payload);
    return data;
  };

  const logout = async () => {
    await axios.post('/auth/logout');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, setUser, login, register, logout, refreshUser: fetchMe, updateProfile, changePassword }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
