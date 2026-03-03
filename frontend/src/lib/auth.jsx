import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [qual, setQual] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('door_token');
    if (!token) { setLoading(false); return; }
    try {
      const { user, qual } = await api.me();
      setUser(user);
      setQual(qual);
    } catch {
      localStorage.removeItem('door_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('door_token', data.token);
    setUser(data.user);
    setQual(data.user.qual_tier ? { qual_tier: data.user.qual_tier } : null);
    return data;
  };

  const register = async (formData) => {
    const data = await api.register(formData);
    localStorage.setItem('door_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('door_token');
    setUser(null);
    setQual(null);
  };

  const refreshUser = () => loadUser();

  return (
    <AuthContext.Provider value={{ user, qual, setQual, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
