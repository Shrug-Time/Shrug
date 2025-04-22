"use client";

import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';

export default function SubscriptionsPage() {
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