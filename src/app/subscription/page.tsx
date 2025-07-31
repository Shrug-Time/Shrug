"use client";

import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Client component that uses useSearchParams
function SubscriptionContent() {
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const success = searchParams?.get('success');
  const sessionId = searchParams?.get('session_id');

  useEffect(() => {
    if (success === 'true' && sessionId) {
      setShowSuccess(true);
      // Clear the URL params after showing success
      const timer = setTimeout(() => {
        window.history.replaceState({}, '', '/subscription');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, sessionId]);

  return (
    <div className="container mx-auto px-4 py-8">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Payment Successful!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Your subscription has been activated successfully. Welcome to Premium!
                </p>
                {sessionId && (
                  <p className="mt-1 text-xs">
                    Session ID: {sessionId}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <h1 className="text-2xl font-bold mb-6">Manage Your Subscription</h1>
      <SubscriptionManagement 
        onSubscriptionChange={() => {
          // Refresh the page or show success message
          alert("Subscription updated successfully!");
        }}
      />
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <SubscriptionContent />
    </Suspense>
  );
} 