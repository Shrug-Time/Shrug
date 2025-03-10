"use client";

import { useState, useEffect } from 'react';
import { auth, db } from '@/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { UserProfile, Post } from '@/types/models';
import Link from "next/link";
import { FollowButton } from '@/components/common/FollowButton';
import { QuestionList } from '@/components/questions/QuestionList';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
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

  // Separate useEffect for fetching posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!profile?.userID) return;

      console.log('Starting to fetch posts for user:', profile.userID);
      try {
        const postsRef = collection(db, 'posts');
        const postsSnapshot = await getDocs(postsRef);
        
        const allPosts = postsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as Post;
        });
        
        // Filter posts to only include those where the user has provided answers
        const userPosts = allPosts.filter(post => {
          return post.answers?.some(answer => {
            // Check userId field
            return answer.userId === profile.userID;
          });
        });
        
        console.log('Found', userPosts.length, 'posts with answers by user:', profile.userID);
        setUserPosts(userPosts);
      } catch (error) {
        console.error('Error fetching user posts:', error);
      }
    };

    fetchUserPosts();
  }, [profile?.userID]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        setProfile(userData);
        setEditForm({
          name: userData.name,
          userID: userData.userID,
          bio: userData.bio || ''
        });
      } else {
        // Get user's display name or email name
        const displayName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
        const emailPrefix = user.email?.split('@')[0] || 'user';
        
        // Initialize default profile
        const defaultProfile: UserProfile = {
          name: displayName,
          userID: emailPrefix.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'user',
          email: user.email || 'anonymous@example.com',
          bio: '',
          verificationStatus: user.emailVerified ? 'email_verified' : 'unverified',
          membershipTier: 'free',
          refreshesRemaining: 5,
          refreshResetTime: new Date().toISOString(),
          following: [],
          followers: [],
          createdAt: new Date().toISOString(),
          totems: {
            created: [],
            frequently_used: [],
            recent: []
          },
          expertise: []
        };
        setProfile(defaultProfile);
        setEditForm({
          name: defaultProfile.name,
          userID: defaultProfile.userID,
          bio: defaultProfile.bio || ''
        });
        await setDoc(doc(db, 'users', user.uid), defaultProfile);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const validateUserID = async (userID: string): Promise<boolean> => {
    // Check minimum length
    if (userID.length < 3) {
      setUserIDError("User ID must be at least 3 characters long");
      return false;
    }

    // Check maximum length
    if (userID.length > 15) {
      setUserIDError("User ID must be less than 15 characters");
      return false;
    }

    // If it's the same as current userID, no need to validate further
    if (userID === profile?.userID) {
      setUserIDError(null);
      return true;
    }

    // Check if userID contains only allowed characters
    const validIDRegex = /^[a-z0-9_-]+$/;
    if (!validIDRegex.test(userID.toLowerCase())) {
      setUserIDError("User ID can only contain lowercase letters, numbers, underscores, and hyphens");
      return false;
    }

    setIsCheckingID(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('userID', '==', userID.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setUserIDError("This User ID is already taken");
        return false;
      }
      
      setUserIDError(null);
      return true;
    } catch (error) {
      console.error('Error checking User ID:', error);
      setUserIDError("Error checking User ID availability");
      return false;
    } finally {
      setIsCheckingID(false);
    }
  };

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
    if (!auth.currentUser || !profile) return;

    try {
      if (editForm.userID !== profile.userID) {
        const isValid = await validateUserID(editForm.userID);
        if (!isValid) return;
      }

      const updatedProfile = {
        ...profile,
        name: editForm.name,
        userID: editForm.userID,
        bio: editForm.bio
      };

      await setDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile);
      setProfile(updatedProfile);
      setIsEditing(false);
      setUserIDError(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          Loading...
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
                        {auth.currentUser && auth.currentUser.uid !== profile.userID && (
                          <FollowButton
                            currentUserId={auth.currentUser.uid}
                            targetUserId={profile.userID}
                            className="ml-4"
                          />
                        )}
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
              {userPosts.length > 0 ? (
                <QuestionList
                  posts={userPosts}
                  onSelectQuestion={async () => {}}
                  onLikeTotem={async () => {}}
                  onRefreshTotem={async () => {}}
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