import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError() as any;
  const navigate = useNavigate();

  const errorMessage =
    error?.statusText || error?.message || 'An unexpected application error occurred.';

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#EAE2D5] rounded-3xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-5">
          <AlertCircle className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-black text-stone-900 tracking-tight mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">{errorMessage}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Reload Page
          </Button>
          <Button onClick={() => navigate('/app/dashboard')} className="w-full sm:w-auto">
            <Home className="w-4 h-4 mr-1.5" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
