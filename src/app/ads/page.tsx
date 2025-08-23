"use client";

import { isFeatureEnabled } from '@/config/featureFlags';
import { redirect } from 'next/navigation';

export default function CommunityAdsPage() {
  // Redirect to home if ads are disabled
  if (!isFeatureEnabled('ADS_ENABLED')) {
    redirect('/');
  }
  
  return null; // This page is disabled

  // Check if user is admin (you can modify this logic based on your admin system)
  const isAdmin = user?.email === 'admin@example.com' || user?.uid === 'your-admin-uid';

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Subscription Promotion Ads</h2>
          <p className="text-gray-600 mb-6">
            Sign in to submit and manage your subscription promotion advertisements.
          </p>
          <a 
            href="/debug/login" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Subscription Promotion Ads</h1>
          <p className="text-gray-600">
            Submit PDF or PNG advertisements that promote our $9.99/month subscription. Include your branding to drive signups through your promotion.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Ads
          </button>
          
          {isPremium && (
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'submit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Submit New Ad
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'admin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin Review
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'dashboard' && (
            <UserAdDashboard 
              onNewSubmission={() => {
                if (isPremium) {
                  setActiveTab('submit');
                }
              }}
            />
          )}

          {activeTab === 'submit' && isPremium && (
            <AdSubmissionForm 
              onSubmissionComplete={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'admin' && isAdmin && (
            <AdminAdReview isAdmin={isAdmin} />
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-gray-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">How Subscription Promotion Works</h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="font-medium text-gray-900 mb-2">📝 Create</div>
              <p className="text-gray-600">
                Premium members can submit PDF or PNG ads promoting our $9.99/month subscription. Include your name/branding to drive signups through your promotion.
              </p>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-2">👀 Review</div>
              <p className="text-gray-600">
                Our team reviews submissions to ensure they prominently feature the subscription pricing and encourage signups effectively.
              </p>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-2">🔄 Rotate</div>
              <p className="text-gray-600">
                Approved ads are displayed equally across the platform. Promote subscriptions while building your brand presence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 