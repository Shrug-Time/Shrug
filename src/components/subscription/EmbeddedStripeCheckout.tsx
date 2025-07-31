'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useAuth } from '@/contexts/AuthContext';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function PaymentForm({ clientSecret, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/subscription?success=true`,
      },
    });

    if (error) {
      console.error('Payment failed:', error);
      setMessage(error.message || 'An unexpected error occurred.');
      onError(error.message || 'Payment failed');
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      console.log('Payment succeeded:', paymentIntent);
      setMessage('Payment succeeded! Creating your subscription...');
      
      // Call our API to create the actual subscription
      try {
        const response = await fetch('/api/stripe/create-subscription-from-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });

        if (response.ok) {
          onSuccess();
        } else {
          setMessage('Payment succeeded but subscription creation failed. Please contact support.');
        }
      } catch (err) {
        setMessage('Payment succeeded but subscription creation failed. Please contact support.');
      }
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border border-gray-200 rounded-lg">
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>
      
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('succeeded') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        {isLoading ? 'Processing...' : 'Subscribe to Premium - $9.99/month'}
      </button>
      
      <div className="text-xs text-gray-500 text-center">
        <p>🔒 Your payment information is secure and encrypted</p>
        <p>💳 This will create a recurring monthly subscription</p>
      </div>
    </form>
  );
}

export default function EmbeddedStripeCheckout() {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const createPaymentIntent = async () => {
    if (!user) {
      setError('Please log in to subscribe');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = await user.getIdToken();
      
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setSuccess(true);
    // Optionally refresh the page or redirect
    setTimeout(() => {
      window.location.href = '/subscription?success=true';
    }, 2000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!user) {
    return (
      <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please log in to subscribe to Premium.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-green-800 mb-2">Subscription Created!</h3>
        <p className="text-green-700">Your premium subscription is now active. Redirecting you...</p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Premium Subscription</h3>
          <p className="text-blue-700 mb-4">
            Get access to premium features including:
          </p>
          <ul className="text-blue-700 text-sm space-y-1 mb-4">
            <li>• 20 refreshes per day (vs 5 for free)</li>
            <li>• Ad-free experience</li>
            <li>• Premium support</li>
            <li>• Advanced features</li>
          </ul>
          <p className="text-blue-900 font-semibold mb-2">Only $9.99/month</p>
          <p className="text-blue-600 text-sm">
            ✨ <strong>New:</strong> Pay without leaving this page! No redirects needed.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={createPaymentIntent}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Initializing...' : 'Start Subscription'}
        </button>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Complete Your Subscription</h3>
        <p className="text-blue-700 text-sm">
          You're about to subscribe to Premium for $9.99/month. Please enter your payment details below.
        </p>
      </div>

      <Elements stripe={stripePromise} options={options}>
        <PaymentForm
          clientSecret={clientSecret}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </Elements>
    </div>
  );
} 