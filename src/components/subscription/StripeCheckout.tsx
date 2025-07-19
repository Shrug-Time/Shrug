'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface StripeCheckoutProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function StripeCheckout({ 
  onSuccess, 
  onCancel, 
  className = '' 
}: StripeCheckoutProps) {
  const { user } = useAuth();
  const { refreshSubscriptionState } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) {
      setError('You must be logged in to subscribe');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the user's Firebase token
      const token = await user.getIdToken();
      
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError('Failed to start checkout process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      setError('You must be logged in to manage your subscription');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the user's Firebase token
      const token = await user.getIdToken();
      
      // Create portal session
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe customer portal
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      setError('Failed to open subscription management. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Premium Subscription
        </h3>
        <p className="text-gray-600 mb-4">
          Unlock premium features and support the platform
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">Access to gated content</span>
          </div>
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">20 daily refreshes (vs 5 free)</span>
          </div>
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">Ad-free experience</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-3xl font-bold text-gray-900">$9.99</span>
            <span className="text-gray-600">/month</span>
          </div>
          <div className="text-sm text-gray-500">
            Cancel anytime
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {isLoading ? 'Processing...' : 'Subscribe Now'}
          </button>
          
          <button
            onClick={handleManageSubscription}
            disabled={isLoading}
            className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Manage Subscription
          </button>
        </div>
      </div>
    </div>
  );
} 