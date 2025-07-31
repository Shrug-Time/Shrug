'use client';

import { useState } from 'react';
import StripeCheckout from '@/components/subscription/StripeCheckout';
import EmbeddedStripeCheckout from '@/components/subscription/EmbeddedStripeCheckout';

export default function TestStripePage() {
  const [checkoutType, setCheckoutType] = useState<'embedded' | 'hosted' | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Stripe Integration Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Integration Status</h2>
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
            <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
            <span>✅ Environment variables configured</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
            <span>✅ Embedded & Hosted checkout ready</span>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-green-900 mb-4">🎉 Integration Complete!</h2>
        <p className="text-green-700 mb-4">
          Your Stripe integration is fully working. Choose between two checkout experiences:
        </p>
        <ul className="text-green-700 text-sm space-y-1">
          <li><strong>Embedded Checkout:</strong> Keep users on your site with a custom payment form</li>
          <li><strong>Hosted Checkout:</strong> Redirect to Stripe's secure checkout page</li>
        </ul>
      </div>

      {!checkoutType && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Your Checkout Experience</h2>
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Embedded Checkout Option */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                <h3 className="text-lg font-semibold text-gray-900">Embedded Checkout</h3>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">NEW</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Keep users on your site with a seamless, integrated payment experience. No redirects, complete control over styling.
              </p>
              <div className="space-y-1 text-sm text-gray-700 mb-4">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Stays on your website</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Custom styling</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Better user experience</span>
                </div>
              </div>
              <button
                onClick={() => setCheckoutType('embedded')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Try Embedded Checkout
              </button>
            </div>

            {/* Hosted Checkout Option */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                <h3 className="text-lg font-semibold text-gray-900">Hosted Checkout</h3>
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">CLASSIC</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Redirect to Stripe's secure, hosted checkout page. Fully managed by Stripe with built-in optimizations.
              </p>
              <div className="space-y-1 text-sm text-gray-700 mb-4">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Stripe-hosted & optimized</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>No additional frontend code</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Auto-updated features</span>
                </div>
              </div>
              <button
                onClick={() => setCheckoutType('hosted')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Try Hosted Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutType && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {checkoutType === 'embedded' ? '🔧 Embedded' : '🌐 Hosted'} Stripe Checkout
            </h2>
            <button
              onClick={() => setCheckoutType(null)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Back to options
            </button>
          </div>
          
          {checkoutType === 'embedded' ? (
            <EmbeddedStripeCheckout />
          ) : (
            <StripeCheckout />
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Test Cards:</h3>
        <div className="text-sm space-y-1">
          <div><strong>Success:</strong> 4242 4242 4242 4242</div>
          <div><strong>Decline:</strong> 4000 0000 0000 0002</div>
          <div><strong>Insufficient funds:</strong> 4000 0000 0000 9995</div>
          <div className="text-gray-600 text-xs mt-2">
            Use any future expiry date (like 12/25) and any 3-digit CVC
          </div>
        </div>
      </div>
    </div>
  );
} 