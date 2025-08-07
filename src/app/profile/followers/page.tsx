"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { UserProfile } from '@/types/models';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';
import { FollowButton } from '@/components/common/FollowButton';
import { useUser } from '@/hooks/useUser';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/userService';
import { Sidebar } from '@/components/layout/Sidebar';

export default function FollowersPage() {
  const { profile, isLoading: isLoadingProfile } = useUser();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const loadFollowers = async () => {
      if (!profile?.firebaseUid) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const followersList = await UserService.getFollowers(profile.firebaseUid);
        setFollowers(followersList);
      } catch (err) {
        console.error('Error loading followers:', err);
        setError('Failed to load followers list');
        setToastMessage({
          message: 'Failed to load followers list',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (profile?.firebaseUid) {
      loadFollowers();
    }
  }, [profile?.firebaseUid]);

  const handleFollowChange = () => {
    // Reload the followers list when follow status changes
    if (profile?.firebaseUid) {
      UserService.getFollowers(profile.firebaseUid)
        .then(setFollowers)
        .catch(err => {
          console.error('Error reloading followers:', err);
        });
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  if (isLoadingProfile || !profile) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activePage="content" />
        <div className="flex-1">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-gray-600">Loading profile data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="content" />
      
      <div className="flex-1">
        {/* Show toast messages */}
        {toastMessage && (
          <Toast 
            message={toastMessage.message} 
            type={toastMessage.type}
          />
        )}
        
        <div className="max-w-4xl mx-auto p-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link 
                href="/profile"
                className="mr-4 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to Profile
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Followers</h1>
            <p className="text-gray-600 mt-2">
              People following you ({followers.length})
            </p>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : followers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No followers yet</h3>
              <p className="text-gray-600 mb-4">
                When people follow you, they'll appear here.
              </p>
              <Link
                href="/search"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Discover People
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {followers.map((user) => (
                <div 
                  key={user.firebaseUid}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleUserClick(user.firebaseUid)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* User Avatar */}
                      <div className="flex-shrink-0">
                        {user.photoURL ? (
                          <Image 
                            src={user.photoURL} 
                            alt={`${user.name}'s profile`}
                            width={48}
                            height={48}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-500">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {user.name}
                        </h3>
                        <p className="text-sm text-gray-600">@{user.username}</p>
                        {user.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {user.bio}
                          </p>
                        )}
                        <div className="flex items-center text-xs text-gray-500 space-x-4 mt-2">
                          <span>{user.followers?.length || 0} followers</span>
                          <span>{user.following?.length || 0} following</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Follow Button */}
                    {currentUser && currentUser.uid !== user.firebaseUid && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <FollowButton
                          currentUserId={currentUser.uid}
                          targetUserId={user.firebaseUid}
                          onError={(message) => setToastMessage({ message, type: 'error' })}
                          onFollowChange={handleFollowChange}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 