"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { TotemProvider } from '@/contexts/TotemContext';
import { TotemButton } from '@/components/totem/TotemButton';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post } from '@/types/models';

// Test post data
const testPost: Post = {
  id: 'test-post-1',
  question: 'Test Question',
  answers: [
    {
      id: 'test-answer-1',
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
      name: 'Test User',
      createdAt: Date.now()
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
      <TotemProvider>
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
      </TotemProvider>
    </AuthProvider>
  );
} 