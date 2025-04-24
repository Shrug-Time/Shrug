"use client";

import { Sidebar } from '@/components/layout/Sidebar';
import { useUser } from '@/hooks/useUser';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function SubscribersPage() {
  const { profile, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activePage="subscribers" />
        <div className="flex-1 p-8 flex justify-center items-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="subscribers" />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Your Subscribers</h1>
          
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-4">
              Your subscriber management will be available here soon.
            </p>
            
            <p className="text-sm text-gray-500">
              This feature is under development as part of Phase 3 of the implementation plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 