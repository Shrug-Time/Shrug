'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { PostService, UserService } from '@/services/firebase';

export default function ProfileTest() {
  const [userId, setUserId] = useState<string>('');
  const [inputUserId, setInputUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [authStatus, setAuthStatus] = useState<{authenticated: boolean, user: any | null}>({
    authenticated: false,
    user: null
  });

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthStatus({
          authenticated: true,
          user: {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified
          }
        });
        // Auto-fill the current user's ID
        setInputUserId(user.uid);
      } else {
        setAuthStatus({
          authenticated: false,
          user: null
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleFetchProfile = async () => {
    if (!inputUserId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    setUserId(inputUserId);
    setIsLoading(true);
    setError(null);
    setUserProfile(null);
    setUserPosts([]);

    try {
      console.log(`Fetching profile for user ID: ${inputUserId}`);
      
      // Fetch user profile
      const profile = await UserService.getUserProfile(inputUserId);
      setUserProfile(profile);
      console.log('User profile:', profile);

      // Fetch user posts
      const posts = await PostService.getUserPosts(inputUserId);
      setUserPosts(posts);
      console.log('User posts:', posts);
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Profile Test Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        {authStatus.authenticated ? (
          <div className="text-green-600">
            <p>✅ Authenticated</p>
            <p>User ID: {authStatus.user.uid}</p>
            <p>Email: {authStatus.user.email}</p>
          </div>
        ) : (
          <p className="text-red-600">❌ Not authenticated</p>
        )}
      </div>
      
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={inputUserId}
            onChange={(e) => setInputUserId(e.target.value)}
            placeholder="Enter user ID"
            className="border p-2 rounded flex-grow"
          />
          <button
            onClick={handleFetchProfile}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Fetch Profile'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>
      
      {userId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">User Profile</h2>
            {isLoading ? (
              <p>Loading profile...</p>
            ) : userProfile ? (
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(userProfile, null, 2)}
              </pre>
            ) : (
              <p className="text-red-600">No profile found for this user ID</p>
            )}
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">User Posts</h2>
            {isLoading ? (
              <p>Loading posts...</p>
            ) : userPosts.length > 0 ? (
              <div>
                <p className="mb-2">Found {userPosts.length} posts</p>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(userPosts.map(post => ({
                    id: post.id,
                    question: post.question,
                    answersCount: post.answers?.length || 0,
                    createdAt: post.createdAt
                  })), null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-yellow-600">No posts found for this user ID</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 