import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MOCK_OTP = '123456';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [mobileOtp, setMobileOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState('');

  const { register, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null, submit: null }));

    if (name === 'phone') {
      setOtpSent(false);
      setOtpVerified(false);
      setMobileOtp('');
      setInfoMessage('');
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.name.trim()) nextErrors.name = 'Full name is required';
    if (!formData.phone.trim()) nextErrors.phone = 'Phone number is required';
    if (!/^[0-9]{10}$/.test(formData.phone.trim())) nextErrors.phone = 'Phone number must be 10 digits';
    if (!formData.email.trim()) nextErrors.email = 'Email ID is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = 'Please enter a valid email ID';

    if (!otpVerified) nextErrors.mobileOtp = 'Please verify mobile OTP before continuing';

    return nextErrors;
  };

  const handleSendOtp = () => {
    const phone = formData.phone.trim();
    if (!/^[0-9]{10}$/.test(phone)) {
      setErrors((prev) => ({ ...prev, phone: 'Enter valid 10-digit phone number to send OTP' }));
      return;
    }

    setOtpSent(true);
    setOtpVerified(false);
    setMobileOtp('');
    setInfoMessage('OTP sent to mobile number. Use 123456 (mock).');
    setErrors((prev) => ({ ...prev, phone: null, mobileOtp: null }));
  };

  const handleVerifyOtp = () => {
    if (!otpSent) return;

    if (mobileOtp === MOCK_OTP) {
      setOtpVerified(true);
      setInfoMessage('Mobile number verified successfully.');
      setErrors((prev) => ({ ...prev, mobileOtp: null }));
    } else {
      setOtpVerified(false);
      setErrors((prev) => ({ ...prev, mobileOtp: 'Invalid OTP. Please try again.' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors((prev) => ({ ...prev, submit: null }));

    try {
      const registerResult = await register({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: 'password123',
        role: 'user',
      });
      if (!registerResult.success) {
        throw new Error(registerResult.error || 'Registration failed');
      }

      const otpResult = await verifyOTP('123456', mobileOtp);
      if (!otpResult.success) {
        throw new Error(otpResult.error || 'OTP verification failed');
      }

      navigate('/kyc', { replace: true });
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.message || 'Signup failed. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-blue-900">Create Account</h2>
            <p className="text-slate-600 mt-2">Start your property journey</p>
          </div>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg text-sm">
              {infoMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name (As per Govt Records) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter 10-digit mobile number"
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="px-4 py-3 rounded-lg hardgreen text-white hover:bg-green-600 text-sm font-medium"
                >
                  Verify
                </button>
              </div>
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            {otpSent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Mobile OTP <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mobileOtp}
                    onChange={(e) => {
                      setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setErrors((prev) => ({ ...prev, mobileOtp: null }));
                    }}
                    placeholder="6-digit OTP"
                    className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.mobileOtp ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className={`px-4 py-3 rounded-lg text-white text-sm font-medium ${
                      otpVerified ? 'bg-green-600' : 'hardgreen hover:bg-green-600'
                    }`}
                  >
                    {otpVerified ? 'Verified' : 'Verify OTP'}
                  </button>
                </div>
                {errors.mobileOtp && <p className="mt-1 text-sm text-red-600">{errors.mobileOtp}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email ID <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                loading ? 'hardgreen cursor-not-allowed' : 'hardgreen hover:bg-green-600'
              }`}
            >
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
