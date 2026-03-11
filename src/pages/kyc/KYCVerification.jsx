import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MOCK_OTP = '123456';

const buildCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const KYCVerification = () => {
  const { updateKYCStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    aadhaarNumber: '',
    captchaInput: '',
    otp: '',
  });
  const [captchaCode, setCaptchaCode] = useState(buildCaptcha());
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const isCaptchaMatched = useMemo(
    () => formData.captchaInput.trim().toUpperCase() === captchaCode,
    [formData.captchaInput, captchaCode]
  );

  const refreshCaptcha = () => {
    setCaptchaCode(buildCaptcha());
    setFormData((prev) => ({ ...prev, captchaInput: '' }));
    setErrors((prev) => ({ ...prev, captchaInput: null }));
  };

  const handleSendOtp = () => {
    const nextErrors = {};

    if (!/^\d{12}$/.test(formData.aadhaarNumber.trim())) {
      nextErrors.aadhaarNumber = 'Aadhaar number must be exactly 12 digits';
    }
    if (!isCaptchaMatched) {
      nextErrors.captchaInput = 'Captcha does not match';
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setOtpSent(true);
    setOtpVerified(false);
    setMessage('OTP sent successfully. Use 123456 for now.');
  };

  const handleVerifyOtp = () => {
    if (!otpSent) return;

    if (formData.otp === MOCK_OTP) {
      setOtpVerified(true);
      setErrors((prev) => ({ ...prev, otp: null }));
      setMessage('OTP verified successfully. You can now submit KYC.');
      return;
    }

    setOtpVerified(false);
    setErrors((prev) => ({ ...prev, otp: 'Invalid OTP. Please try again.' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    if (!otpSent) {
      nextErrors.otp = 'Click Verify and send OTP first';
    } else if (!otpVerified) {
      nextErrors.otp = 'Please verify OTP before submitting KYC';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      await updateKYCStatus('verified');
      setLoading(false);
      const redirectPath = location.state?.from || '/profile';
      navigate(redirectPath, { replace: true });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-400">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-900">KYC Verification</h1>
            <p className="text-slate-600 mt-2">
              Enter Aadhaar, complete captcha, verify OTP, then submit KYC
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aadhaar Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.aadhaarNumber}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12),
                  }));
                  setErrors((prev) => ({ ...prev, aadhaarNumber: null }));
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.aadhaarNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter 12-digit Aadhaar"
              />
              {errors.aadhaarNumber && <p className="mt-1 text-sm text-red-600">{errors.aadhaarNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Captcha <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-lg border border-dashed border-gray-400 bg-gray-50 font-mono text-lg tracking-widest text-gray-800">
                    {captchaCode}
                  </div>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Refresh
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.captchaInput}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, captchaInput: e.target.value.toUpperCase() }));
                    setErrors((prev) => ({ ...prev, captchaInput: null }));
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.captchaInput ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter captcha exactly as shown"
                />
                {errors.captchaInput && <p className="text-sm text-red-600">{errors.captchaInput}</p>}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full py-3 rounded-lg hardgreen text-white font-medium hover:bg-green-600"
                >
                  Verify & Send OTP
                </button>
              </div>
            </div>

            {otpSent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.otp}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }));
                      setErrors((prev) => ({ ...prev, otp: null }));
                    }}
                    className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.otp ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter 6-digit OTP"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className={`px-4 py-3 rounded-lg text-white font-medium ${
                      otpVerified ? 'bg-green-600' : 'hardgreen hover:bg-green-600'
                    }`}
                  >
                    {otpVerified ? 'Verified' : 'Verify OTP'}
                  </button>
                </div>
                {errors.otp && <p className="mt-1 text-sm text-red-600">{errors.otp}</p>}
              </div>
            )}

            {message && <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{message}</div>}

            <button
              type="submit"
              disabled={loading || !otpVerified}
              className={`w-full py-3 rounded-lg text-white font-medium ${
                loading || !otpVerified ? ' cursor-not-allowed' : 'hardgreen hover:bg-green-600'
              }`}
            >
              {loading ? 'Submitting KYC...' : 'Submit KYC'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default KYCVerification;
