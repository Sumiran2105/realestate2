import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../utils/apiClient';

const PENDING_REGISTRATION_KEY = 'pendingRegistration';
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const loadPendingRegistration = () => {
  try {
    const raw = localStorage.getItem(PENDING_REGISTRATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(PENDING_REGISTRATION_KEY);
    return null;
  }
};

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingRegistration, setPendingRegistration] = useState(loadPendingRegistration);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.me();
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApi.register(userData);
      const pending = {
        email: userData.email,
        phone: userData.phone,
      };
      setPendingRegistration(pending);
      localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending));

      return { success: true, message: response.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (emailOTP, phoneOTP) => {
    try {
      setLoading(true);
      setError(null);

      if (!pendingRegistration?.email || !pendingRegistration?.phone) {
        throw new Error('Registration session expired. Please register again.');
      }

      const response = await authApi.verifyOtp({
        email: pendingRegistration.email,
        phone: pendingRegistration.phone,
        emailOtp: emailOTP,
        phoneOtp: phoneOTP,
      });

      localStorage.removeItem(PENDING_REGISTRATION_KEY);
      setPendingRegistration(null);

      return { success: true, message: response.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async (type) => {
    try {
      setLoading(true);
      setError(null);

      if (!pendingRegistration?.email) {
        throw new Error('Registration session expired. Please register again.');
      }

      const response = await authApi.resendOtp({ email: pendingRegistration.email, type });
      return { success: true, message: response.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApi.login(email, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);

      return { success: true, user: response.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout network failure and clear local state anyway.
    }

    clearSession();
    setUser(null);
  };

  const updateKYCStatus = async (status) => {
    if (!user) return;

    try {
      const response = await authApi.updateKycStatus(status);
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (err) {
      setError(err.message);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      register,
      logout,
      verifyOTP,
      resendOTP,
      updateKYCStatus,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isAgent: user?.role === 'agent',
      isSeller: user?.role === 'seller',
      isBuyer: user?.role === 'buyer',
      needsKYC: user && (user.kycStatus === 'not_started' || user.kycStatus === 'pending'),
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
