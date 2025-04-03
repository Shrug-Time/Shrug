'use client';

import { useEffect, useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TotemProviderV2 } from '@/contexts/TotemContextV2';
import { TotemButton } from '@/components/totem/TotemButtonV2';
import { db } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { Post } from '@/types/modelsV2';

// Test post data
const testPost: Post = {
  id: 'test-post-1',
  question: 'Test Question',
  answers: [
    {
      text: 'Test Answer',
      totems: [
        {
          name: 'Rain',
          crispness: 0,
          likeHistory: []
        },
        {
          name: 'Sun',
          crispness: 0,
          likeHistory: []
        }
      ],
      firebaseUid: 'test-user-1',
      username: 'testuser',
      name: 'Test User'
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export default function TestTotemPage() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeTestData() {
      try {
        await setDoc(doc(db, 'posts', testPost.id), testPost);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing test data:', error);
      }
    }

    initializeTestData();
  }, []);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <AuthProvider>
      <TotemProviderV2>
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Test Totem Page</h1>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-xl font-semibold mb-2">Test Post</h2>
              <p className="text-gray-600 mb-4">{testPost.question}</p>
              <div className="space-y-2">
                <TotemButton
                  postId={testPost.id}
                  totemName="Rain"
                />
                <TotemButton
                  postId={testPost.id}
                  totemName="Sun"
                />
              </div>
            </div>
          </div>
        </div>
      </TotemProviderV2>
    </AuthProvider>
  );
} 