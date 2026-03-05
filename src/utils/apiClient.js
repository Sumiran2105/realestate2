const API_BASE = '/api';

const parseError = async (response) => {
  try {
    const data = await response.json();
    return data?.message || 'Request failed';
  } catch {
    return 'Request failed';
  }
};

const request = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
};

export const authApi = {
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  verifyOtp: ({ email, phone, emailOtp, phoneOtp }) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, phone, emailOtp, phoneOtp }) }),
  resendOtp: ({ email, type }) => request('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email, type }) }),
  updateKycStatus: (status) =>
    request('/users/me/kyc-status', { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export const listingApi = {
  getAll: () => request('/listings'),
  getBySeller: (sellerId) => request(`/listings?sellerId=${encodeURIComponent(sellerId)}`),
  getById: (id) => request(`/listings/${encodeURIComponent(id)}`),
  create: (payload) => request('/listings', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(`/listings/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id) => request(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
