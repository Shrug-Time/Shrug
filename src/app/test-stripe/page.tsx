'use client';

import { useState } from 'react';
import StripeCheckout from '@/components/subscription/StripeCheckout';

export default function TestStripePage() {
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Stripe Integration Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Setup Status</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
            <span>✅ Stripe packages installed</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
            <span>✅ API routes created</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
            <span>✅ Service layer implemented</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
            <span>✅ React components built</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></span>
            <span>⚠️ Environment variables needed</span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-yellow-900 mb-4">Next Steps</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Create a Stripe account at <a href="https://stripe.com" className="text-blue-600 hover:underline">stripe.com</a></li>
          <li>Get your API keys from the Stripe dashboard</li>
          <li>Add environment variables to <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
          <li>Create a product and price in Stripe dashboard</li>
          <li>Set up webhook endpoint</li>
          <li>Test with the checkout component below</li>
        </ol>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Checkout Component</h2>
        <p className="text-gray-600 mb-4">
          This component will work once you've set up your Stripe environment variables.
        </p>
        
        <button
          onClick={() => setShowCheckout(!showCheckout)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {showCheckout ? 'Hide' : 'Show'} Stripe Checkout
        </button>
        
        {showCheckout && (
          <div className="mt-6">
            <StripeCheckout />
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Environment Variables Needed:</h3>
        <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Base URL for redirects
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Firebase Admin (for webhook verification)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"`}
        </pre>
      </div>
    </div>
  );
} 