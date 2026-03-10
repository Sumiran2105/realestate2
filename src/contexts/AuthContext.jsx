import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const REGISTERED_USERS_KEY = 'registeredUsers';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const readRegisteredUsers = () => {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeRegisteredUsers = (users) => {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
};

const normalizeRole = (role) => {
  if (role === 'admin' || role === 'agent') return role;
  return 'user';
};

const sanitizeUser = (userData) => {
  if (!userData) return null;
  const { password, ...safeUser } = userData;
  return safeUser;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tempRegistrationData, setTempRegistrationData] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const normalizedUser = { ...parsedUser, role: normalizeRole(parsedUser?.role) };
        setUser(normalizedUser);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const users = readRegisteredUsers();
      const exists = users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase());
      if (exists) {
        throw new Error('Email already exists');
      }

      setTempRegistrationData({
        id: Date.now(),
        name: userData.name,
        phone: userData.phone,
        email: userData.email,
        password: userData.password,
        role: normalizeRole(userData.role || 'user'),
        createdAt: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true, message: 'Registration initiated. Please verify OTP.' };
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

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (emailOTP !== '123456' || phoneOTP !== '123456') {
        throw new Error('Invalid OTP');
      }

      if (!tempRegistrationData) {
        throw new Error('Registration session expired. Please register again.');
      }

      const users = readRegisteredUsers();
      const createdUser = {
        ...tempRegistrationData,
        kycStatus: 'not_started',
        emailVerified: true,
        phoneVerified: true,
      };
      users.push(createdUser);
      writeRegisteredUsers(users);
      setTempRegistrationData(null);

      const token = `mock_token_${Date.now()}`;
      const safeUser = sanitizeUser(createdUser);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(safeUser));
      setUser(safeUser);

      return { success: true, message: 'Verification successful!', user: safeUser };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true, message: 'OTP resent successfully' };
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

      await new Promise((resolve) => setTimeout(resolve, 300));

      const registeredUsers = readRegisteredUsers();
      let userData = registeredUsers.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password
      );
      if (userData) {
        userData = { ...userData, role: normalizeRole(userData.role) };
      }

      if (!userData) {
        if (email === 'admin@example.com') {
          userData = {
            id: 999,
            name: 'Admin User',
            email,
            role: 'admin',
            kycStatus: 'verified',
            emailVerified: true,
            phoneVerified: true,
            createdAt: new Date().toISOString(),
          };
        } else if (String(email).includes('agent')) {
          userData = {
            id: 2,
            name: 'Mike Agent',
            email,
            role: 'agent',
            kycStatus: 'verified',
            emailVerified: true,
            phoneVerified: true,
            createdAt: new Date().toISOString(),
          };
        } else if (String(email).includes('buyer') || String(email).includes('seller') || String(email).includes('user')) {
          userData = {
            id: 1,
            name: 'John User',
            email,
            role: 'user',
            kycStatus: 'not_started',
            emailVerified: true,
            phoneVerified: true,
            createdAt: new Date().toISOString(),
          };
        } else {
          throw new Error('Invalid credentials');
        }
      }

      const token = `mock_token_${Date.now()}`;
      const safeUser = sanitizeUser(userData);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(safeUser));
      setUser(safeUser);

      return { success: true, user: safeUser };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = async (updates) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return { success: true, user: updatedUser };
  };

  const updateKYCStatus = async (status) => {
    if (!user) return;
    const updatedUser = { ...user, kycStatus: status };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      register,
      logout,
      updateUser,
      verifyOTP,
      resendOTP,
      updateKYCStatus,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isAgent: user?.role === 'agent',
      isUser: user?.role === 'user',
      needsKYC: user && (user.kycStatus === 'not_started' || user.kycStatus === 'pending'),
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
