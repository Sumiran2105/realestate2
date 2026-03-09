import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const KYCVerification = () => {
  const { updateKYCStatus } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    aadhaarNumber: '',
    panNumber: '',
    livePhoto: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Unable to access camera. Please allow permission or upload photo manually.');
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setFormData((prev) => ({ ...prev, livePhoto: dataUrl }));
    setErrors((prev) => ({ ...prev, livePhoto: null }));
    stopCamera();
  };

  const handlePhotoUpload = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, livePhoto: reader.result }));
      setErrors((prev) => ({ ...prev, livePhoto: null }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const nextErrors = {};
    const aadhaar = formData.aadhaarNumber.trim();
    const pan = formData.panNumber.trim().toUpperCase();

    if (!/^\d{12}$/.test(aadhaar)) {
      nextErrors.aadhaarNumber = 'Aadhaar number must be exactly 12 digits';
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      nextErrors.panNumber = 'Enter valid PAN (e.g., ABCDE1234F)';
    }

    if (!formData.livePhoto) {
      nextErrors.livePhoto = 'Live photo is required';
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);

    setTimeout(async () => {
      await updateKYCStatus('verified');
      setLoading(false);
      navigate('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">KYC Verification</h1>
            <p className="text-gray-600 mt-2">Enter Aadhaar, PAN, and upload a live photo</p>
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
                  setFormData((prev) => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }));
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
                PAN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.panNumber}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, panNumber: e.target.value.toUpperCase().slice(0, 10) }));
                  setErrors((prev) => ({ ...prev, panNumber: null }));
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.panNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ABCDE1234F"
              />
              {errors.panNumber && <p className="mt-1 text-sm text-red-600">{errors.panNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Live Photo Upload <span className="text-red-500">*</span>
              </label>

              {formData.livePhoto ? (
                <div className="space-y-3">
                  <img src={formData.livePhoto} alt="Live capture" className="w-full max-w-sm h-56 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, livePhoto: null }))}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Retake / Reupload
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cameraActive ? (
                    <div className="space-y-3">
                      <video ref={videoRef} className="w-full max-w-sm h-56 rounded-lg border bg-black" playsInline muted />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Capture Photo
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Open Camera
                      </button>

                      <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer">
                        Upload from Device
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
                  {errors.livePhoto && <p className="text-sm text-red-600">{errors.livePhoto}</p>}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-medium ${
                loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
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
