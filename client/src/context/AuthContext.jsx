import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const THEME_STORAGE_KEY = 'habitpulse-theme';
const isValidTheme = (value) => value === 'light' || value === 'dark';

const readStoredTheme = () => {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(storedTheme) ? storedTheme : 'light';
  } catch (error) {
    console.error('Unable to read the saved theme preference.', error);
    return 'light';
  }
};

axios.defaults.baseURL = '/api';
axios.defaults.withCredentials = true;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState(readStoredTheme);

  const fetchMe = async () => {
    try {
      const { data } = await axios.get('/auth/me');
      setUser(data.user);
      setThemeState(isValidTheme(data.user?.preferences?.theme) ? data.user.preferences.theme : readStoredTheme());
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
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.bsTheme = theme;
    root.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Unable to save the theme preference in this browser.', error);
    }
  }, [theme]);

  const login = async (credentials) => {
    const { data } = await axios.post('/auth/login', credentials);
    setUser(data.user);
    setThemeState(isValidTheme(data.user?.preferences?.theme) ? data.user.preferences.theme : 'light');
    return data;
  };

  const register = async (payload) => {
    const { data } = await axios.post('/auth/register', payload);
    setUser(data.user);
    setThemeState(isValidTheme(data.user?.preferences?.theme) ? data.user.preferences.theme : 'light');
    return data;
  };

  const updateProfile = async (payload) => {
    const { data } = await axios.put('/auth/profile', payload);
    setUser(data.user);
    if (isValidTheme(data.user?.preferences?.theme)) setThemeState(data.user.preferences.theme);
    return data;
  };

  const setTheme = async (nextTheme) => {
    if (!isValidTheme(nextTheme)) throw new Error('Theme must be light or dark.');
    setThemeState(nextTheme);

    if (user) {
      await axios.put('/auth/profile', { preferences: { theme: nextTheme } });
    }
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
    () => ({ user, loading, theme, setTheme, setUser, login, register, logout, refreshUser: fetchMe, updateProfile, changePassword }),
    [user, loading, theme]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
