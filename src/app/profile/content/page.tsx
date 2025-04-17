"use client";

import { useState } from 'react';
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import { ContentGatingControls } from '@/components/gating/ContentGatingControls';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';

export default function ContentPage() {
  const { user, loading } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'all' | 'premium'>('all');

  // Wait for auth to initialize
  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  // Redirect if not logged in
  if (!user) {
    redirect('/');
  }

  // Mock content items
  const contentItems = [
    { id: 'post-1', title: 'How to catch trout in mountain streams', type: 'Post', isGated: false },
    { id: 'answer-1', title: 'Best fly fishing techniques for beginners', type: 'Answer', isGated: true },
    { id: 'post-2', title: 'Choosing the right fishing gear', type: 'Post', isGated: false },
  ];

  // Filter content based on selected tab
  const filteredContent = selectedTab === 'premium' 
    ? contentItems.filter(item => item.isGated)
    : contentItems;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <ProfileSidebar />
        
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Your Content</h1>
            <div className="flex space-x-2">
              <button 
                onClick={() => setSelectedTab('all')}
                className={`px-4 py-2 rounded-lg ${
                  selectedTab === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                All Content
              </button>
              <button 
                onClick={() => setSelectedTab('premium')}
                className={`px-4 py-2 rounded-lg ${
                  selectedTab === 'premium' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Premium Only
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Content Gating</h2>
              <p className="text-sm text-gray-600">
                Make your content premium-only to monetize your expertise.
              </p>
            </div>
            <div className="p-4">
              <p className="mb-4 text-sm">
                Content gating allows you to restrict access to your premium content. 
                Only subscribers will be able to view gated content.
              </p>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Default Content Access</p>
                  <p className="text-sm text-gray-600">
                    New content will be set to this access level by default
                  </p>
                </div>
                <select className="form-select rounded-md border-gray-300 shadow-sm">
                  <option value="public">Public (Everyone)</option>
                  <option value="premium">Premium Only</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Content Management</h2>
            </div>
            
            {filteredContent.length > 0 ? (
              <div className="divide-y">
                {filteredContent.map(item => (
                  <div key={item.id} className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{item.title}</h3>
                      <span className="text-sm text-gray-500">{item.type}</span>
                    </div>
                    
                    <ContentGatingControls
                      contentId={item.id}
                      creatorId={user.uid}
                      initialIsGated={item.isGated}
                      onGatingChange={(isGated) => {
                        console.log(`Content ${item.id} gating status: ${isGated}`);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">No {selectedTab === 'premium' ? 'premium' : ''} content found</p>
                <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">
                  Create New Content
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 