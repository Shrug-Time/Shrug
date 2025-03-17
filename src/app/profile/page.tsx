"use client";

import { useState } from 'react';
import { auth, db } from '@/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { UserProfile, Post } from '@/types/models';
import Link from "next/link";
import { FollowButton } from '@/components/common/FollowButton';
import { QuestionList } from '@/components/questions/QuestionList';
import { usePosts } from '@/hooks/usePosts';
import { useUser } from '@/hooks/useUser';

export default function ProfilePage() {
  const { profile, isLoading: isLoadingProfile, error: profileError, updateProfile } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    userID: '',
    bio: ''
  });
  const [userIDError, setUserIDError] = useState<string | null>(null);
  const [isCheckingID, setIsCheckingID] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'management'>('public');
  const router = useRouter();

  // Use the enhanced usePosts hook with infinite query
  const {
    data: postsData,
    isLoading: isLoadingPosts,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = usePosts({
    userId: profile?.userID,
    firebaseUid: auth.currentUser?.uid,
    pageSize: 10
  });

  // Flatten the pages data
  const userPosts = postsData?.pages?.flatMap(page => page?.items ?? []) ?? [];

  const handleStartEditing = () => {
    setIsEditing(true);
    setEditForm({
      name: profile?.name || '',
      userID: profile?.userID || '',
      bio: profile?.bio || ''
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setUserIDError(null);
    if (profile) {
      setEditForm({
        name: profile.name,
        userID: profile.userID,
        bio: profile.bio || ''
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsCheckingID(true);
      await updateProfile({
        name: editForm.name,
        userID: editForm.userID,
        bio: editForm.bio
      });
      setIsEditing(false);
    } catch (error) {
      // Error is already handled by the hook
      console.error('Failed to update profile:', error);
    } finally {
      setIsCheckingID(false);
    }
  };

  if (isLoadingProfile || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          Loading...
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-red-600">
          Error: {profileError}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                Shrug
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Profile
              </Link>
              <button
                onClick={() => auth.signOut()}
                className="px-4 py-2 text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        {activeTab === 'public' ? (
          <div className="space-y-6">
            {/* Public Profile Section */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-4 flex-grow">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg border-gray-300"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          User ID
                        </label>
                        <input
                          type="text"
                          value={editForm.userID}
                          onChange={(e) => {
                            const newID = e.target.value.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
                            setEditForm(prev => ({ ...prev, userID: newID }));
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            userIDError ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Choose a unique ID (lowercase letters, numbers, _, -)"
                          maxLength={15}
                        />
                        {userIDError && (
                          <p className="text-sm text-red-500 mt-1">{userIDError}</p>
                        )}
                        {isCheckingID && (
                          <p className="text-sm text-gray-500 mt-1">Checking ID availability...</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl font-semibold">{profile.name}</h2>
                      <p className="text-gray-600">@{profile.userID}</p>
                      <div className="mt-4 flex items-center space-x-4">
                        <div className="text-sm text-gray-600">
                          <span className="font-semibold">{profile.followers?.length || 0}</span> followers
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-semibold">{profile.following?.length || 0}</span> following
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      profile.verificationStatus === 'identity_verified'
                        ? 'bg-green-100 text-green-800'
                        : profile.verificationStatus === 'email_verified'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {profile.verificationStatus ? profile.verificationStatus.replace('_', ' ') : 'Not Verified'}
                    </span>
                    <span className="px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      {profile.membershipTier} member
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleStartEditing}
                      className="px-4 py-2 border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
              
              <div className="prose max-w-none">
                {isEditing ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full p-4 border rounded-xl"
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <>
                    <p className="text-gray-600">{profile.bio || 'No bio yet'}</p>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Refresh Status</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Daily Refreshes:</span>
                          <span className="text-sm font-medium">
                            {profile.refreshesRemaining}/{profile.membershipTier === 'premium' ? 10 : 5}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          {[...Array(profile.membershipTier === 'premium' ? 10 : 5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-6 rounded ${
                                i < profile.refreshesRemaining
                                  ? 'bg-purple-500'
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Next refresh reset: {new Date(profile.refreshResetTime).toLocaleString()}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Content Showcase */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Your Answers</h3>
              {isLoadingPosts && !isFetchingNextPage ? (
                <p className="text-gray-600">Loading answers...</p>
              ) : userPosts.length > 0 ? (
                <QuestionList
                  posts={userPosts}
                  onSelectQuestion={async () => {}}
                  onLikeTotem={async () => {}}
                  onRefreshTotem={async () => {}}
                  showAllTotems={false}
                  hasNextPage={hasNextPage}
                  isLoading={isFetchingNextPage}
                  onLoadMore={fetchNextPage}
                />
              ) : (
                <p className="text-gray-600">No answers yet</p>
              )}
            </div>

            {profile.membershipTier === 'premium' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Premium Features</h3>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    As a premium member, you have access to:
                  </p>
                  <ul className="list-disc list-inside text-gray-600">
                    <li>10 daily refreshes</li>
                    <li>Priority answer placement</li>
                    <li>Advanced totem analytics</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Management Section */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
              <div className="space-y-4">
                <button
                  onClick={() => {/* TODO: Implement password change */}}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                >
                  Change Password
                </button>
                {profile.verificationStatus && !profile.verificationStatus.includes('verified') && (
                  <button
                    onClick={() => {/* TODO: Implement verification flow */}}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                  >
                    Verify Account
                  </button>
                )}
                {profile.membershipTier !== 'premium' && (
                  <button
                    onClick={() => {/* TODO: Implement upgrade flow */}}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600"
                  >
                    Upgrade to Premium
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 