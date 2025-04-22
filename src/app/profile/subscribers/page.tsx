"use client";

import { useState } from 'react';
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';

export default function SubscribersPage() {
  const { user, loading } = useAuth();
  const [subscribers, setSubscribers] = useState([
    { id: 'user1', name: 'Jane Smith', username: 'janesmith', avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JS' },
    { id: 'user2', name: 'John Doe', username: 'johndoe', avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JD' },
    { id: 'user3', name: 'Alex Johnson', username: 'alexj', avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AJ' },
  ]);

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
          <h1 className="text-2xl font-bold mb-6">Your Subscribers</h1>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Users who subscribe to your content</h2>
              <p className="text-sm text-gray-600">
                These users can access your premium content.
              </p>
            </div>
            
            {subscribers.length > 0 ? (
              <ul className="divide-y">
                {subscribers.map(subscriber => (
                  <li key={subscriber.id} className="p-4 flex items-center">
                    <img 
                      src={subscriber.avatarUrl} 
                      alt={subscriber.name} 
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <h3 className="font-medium">{subscriber.name}</h3>
                      <p className="text-sm text-gray-600">@{subscriber.username}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">You don't have any subscribers yet</p>
                <p className="mt-2 text-sm text-gray-600">
                  When users subscribe to your premium content, they'll appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 