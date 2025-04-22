"use client";

import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';

export default function SubscriptionPage() {
  return (
    <div className="container mx-auto px-4 py-8">
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