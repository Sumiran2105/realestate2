import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MANUAL_SEARCH_FEE = 299;
const PROPERTY_SEARCH_FEE = 199;

const ManualSearchPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const request = location.state?.request || null;
  const isManualSearch = request?.requestType !== 'property_search';
  const feeAmount = isManualSearch ? MANUAL_SEARCH_FEE : PROPERTY_SEARCH_FEE;
  const enteredFields = request
    ? [
        ['State', request.state],
        ['District', request.district],
        ['City/Mandal', request.cityMandal],
        ['Village', request.village],
        ['Survey Number', request.surveyNumber],
        ['Passbook Number', request.passbookNumber],
      ].filter(([, value]) => String(value || '').trim().length > 0)
    : [];

  useEffect(() => {
    if (!request) {
      navigate('/', { replace: true });
    }
  }, [request, navigate]);

  const handlePayAndSubmit = () => {
    if (!request) return;
    setIsProcessing(true);

    setTimeout(() => {
      const existing = JSON.parse(localStorage.getItem('manualSearchRequests') || '[]');
      const orderId = `MSR-${Date.now()}`;
      const nextOrder = {
        id: Date.now(),
        orderId,
        requestType: request?.requestType || 'manual_search',
        userId: user?.id || null,
        userEmail: user?.email || null,
        userName: user?.name || null,
        ...request,
        status: request?.requestType === 'property_search' ? 'completed' : 'processing',
        reportGenerated: request?.requestType === 'property_search',
        paymentStatus: 'paid',
        paidAmount: feeAmount,
        paidAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      };
      existing.unshift(nextOrder);
      localStorage.setItem('manualSearchRequests', JSON.stringify(existing));

      const unifiedOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
      unifiedOrders.unshift(nextOrder);
      localStorage.setItem('userOrders', JSON.stringify(unifiedOrders));

      if (request?.requestType === 'property_search') {
        navigate(`/verification-report/${request.propertyId}`, { replace: true });
        return;
      }

      navigate('/', { replace: true, state: { manualSearchSubmitted: true } });
    }, 1000);
  };

  if (!request) return null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Manual Search Payment</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review request details and complete payment to submit.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
          {enteredFields.length === 0 ? (
            <p>No input fields provided.</p>
          ) : (
            enteredFields.map(([label, value]) => (
              <p key={label}><span className="font-semibold">{label}:</span> {value}</p>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-sm font-medium text-emerald-800">{isManualSearch ? 'Manual Search Fee' : 'Search Details Fee'}</span>
          <span className="text-lg font-bold text-emerald-900">Rs.{feeAmount}</span>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePayAndSubmit}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-lg hardgreen text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? 'Processing...' : 'Pay & Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualSearchPayment;
