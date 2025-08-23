"use client";

import { isFeatureEnabled } from '@/config/featureFlags';
import { redirect } from 'next/navigation';

export default function SubscriptionsPage() {
  // Redirect to home if subscriber management is disabled
  if (!isFeatureEnabled('SUBSCRIBER_MANAGEMENT_ENABLED')) {
    redirect('/');
  }
  
  return null; // This page is disabled
  const { user, loading } = useAuth();

  // Wait for auth to initialize
  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  // Redirect if not logged in
  if (!user) {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <ProfileSidebar />
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-6">Manage Your Subscriptions</h1>
          <SubscriptionManagement 
            onSubscriptionChange={() => {
              // Refresh the page or show success message
              alert("Subscription updated successfully!");
            }}
          />
        </div>
      </div>
    </div>
  );
} 