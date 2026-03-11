import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getKycBadge = (status) => {
  if (status === 'verified') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-700 border-rose-200';
};

const getKycLabel = (status) => {
  if (status === 'verified') return 'verified';
  if (status === 'pending') return 'pending';
  return 'not verified';
};

const getOrderStatusBadge = (status) => {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'processing') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const formatOrderType = (type) => {
  if (type === 'property_search') return 'Property Search';
  return 'Manual Search';
};

const BuyerProfile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    budget: '',
    propertyType: '',
    timeline: '',
    notifications: true,
  });

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      city: user.city || 'Hyderabad',
      budget: user.budget || '50L - 1Cr',
      propertyType: user.propertyType || 'Apartment',
      timeline: user.timeline || 'Within 3 months',
      notifications: user.notifications ?? true,
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadOrders = () => {
      const unified = JSON.parse(localStorage.getItem('userOrders') || '[]');
      const legacyManual = JSON.parse(localStorage.getItem('manualSearchRequests') || '[]');
      const merged = [...unified, ...legacyManual];
      const deduped = merged.filter((item, index, arr) => {
        const key = item?.orderId || `legacy-${item?.id}`;
        return arr.findIndex((candidate) => (candidate?.orderId || `legacy-${candidate?.id}`) === key) === index;
      });
      const mine = deduped
        .filter((item) => String(item?.userId) === String(user.id) || String(item?.userEmail) === String(user.email))
        .sort((a, b) => new Date(b?.submittedAt || b?.paidAt || 0) - new Date(a?.submittedAt || a?.paidAt || 0));
      setOrders(mine);
    };

    loadOrders();
    window.addEventListener('focus', loadOrders);
    return () => window.removeEventListener('focus', loadOrders);
  }, [user]);

  const completionScore = useMemo(() => {
    const values = [profile.name, profile.email, profile.phone, profile.city, profile.budget, profile.propertyType, profile.timeline];
    const completed = values.filter((item) => String(item).trim().length > 0).length;
    return Math.round((completed / values.length) * 100);
  }, [profile]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setProfile((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    const result = await updateUser(profile);
    if (result?.success) {
      setSaveMessage('Profile saved successfully.');
      setIsEditing(false);
    } else {
      setSaveMessage('Unable to save profile. Please try again.');
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-900 px-6 py-8 text-white sm:px-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-300">Account Center</p>
                <h1 className="mt-1 text-3xl font-bold">My Profile</h1>
                <p className="mt-2 text-sm text-slate-300">Manage your personal details and buying preferences.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing((prev) => !prev)}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
              >
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-3">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-xl font-bold text-white">
                    {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{profile.name || 'User'}</p>
                    <p className="text-sm text-slate-500">{profile.email || 'No email set'}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Role</span>
                    <span className="font-medium capitalize text-slate-800">{user?.role || 'user'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">KYC</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getKycBadge(user?.kycStatus)}`}>
                      {getKycLabel(user?.kycStatus)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Joined</span>
                    <span className="font-medium text-slate-800">{formatDate(user?.createdAt)}</span>
                  </div>
                </div>
                {user?.kycStatus !== 'verified' && (
                  <Link
                    to="/kyc"
                    className="mt-4 inline-flex w-full justify-center rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-200"
                  >
                    Complete KYC
                  </Link>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">Profile Completion</p>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-slate-900" style={{ width: `${completionScore}%` }} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{completionScore}% completed</p>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-slate-600">
                    Full Name
                    <input
                      name="name"
                      value={profile.name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    Email
                    <input
                      name="email"
                      value={profile.email}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    Phone
                    <input
                      name="phone"
                      value={profile.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    City
                    <input
                      name="city"
                      value={profile.city}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
                    />
                  </label>
                </div>
              </div>

              {/* <div className="rounded-2xl border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Buying Preferences</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-slate-600">
                    Budget
                    <input
                      name="budget"
                      value={profile.budget}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    Property Type
                    <input
                      name="propertyType"
                      value={profile.propertyType}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="block text-sm text-slate-600 sm:col-span-2">
                    Purchase Timeline
                    <input
                      name="timeline"
                      value={profile.timeline}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      name="notifications"
                      checked={profile.notifications}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Notify me about matching listings and price updates
                  </label>
                </div>
              </div> */}

              <div className="rounded-2xl border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-900">My Orders</h2>
                {orders.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">No orders yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      (() => {
                        const displayStatus =
                          order?.requestType === 'property_search' &&
                          (order?.reportGenerated || order?.paymentStatus === 'paid')
                            ? 'completed'
                            : (order?.status || 'submitted');

                        return (
                      <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{order.orderId || `MSR-${order.id}`}</p>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getOrderStatusBadge(displayStatus)}`}>
                            {displayStatus}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-700">
                          {formatOrderType(order.requestType)}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {order.state}, {order.district} | {order.cityMandal || '-'} | {order.village || '-'}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Survey: {order.surveyNumber || '-'} | Passbook: {order.passbookNumber || '-'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Payment: {order.paymentStatus || 'pending'} | Amount: Rs.{order.paidAmount || 0} | Date: {formatDate(order.paidAt || order.submittedAt)}
                        </p>
                      </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {saveMessage && <p className="text-sm text-slate-600">{saveMessage}</p>}
                <button
                  type="button"
                  disabled={!isEditing || isSaving}
                  onClick={handleSave}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerProfile;
