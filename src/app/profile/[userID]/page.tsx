"use client";

import { useState, useEffect, use } from 'react';
import { auth, db } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { UserProfile, Post } from '@/types/models';
import Link from "next/link";
import { FollowButton } from '@/components/common/FollowButton';
import { QuestionList } from '@/components/questions/QuestionList';

export default function UserProfilePage({ params }: { params: Promise<{ userID: string }> }) {
  const resolvedParams = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Query users collection by userID
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('userID', '==', resolvedParams.userID));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data() as UserProfile;
          setProfile(userData);
          
          // Fetch user's posts
          const postsRef = collection(db, 'posts');
          const postsQuery = query(postsRef, where('answers', 'array-contains', { userID: resolvedParams.userID }));
          const postsSnapshot = await getDocs(postsQuery);
          
          const posts = postsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Post[];
          
          setUserPosts(posts);
        } else {
          console.error('User not found');
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (resolvedParams.userID) {
      fetchUserProfile();
    }
  }, [resolvedParams.userID, router]);

  if (!profile || !currentUser) {
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
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Shrug
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                My Profile
              </Link>
              <button
                onClick={() => {
                  auth.signOut();
                  router.push('/login');
                }}
                className="px-4 py-2 text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
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
                    {currentUser && currentUser.uid !== profile.userID && (
                      <FollowButton
                        currentUserId={currentUser.uid}
                        targetUserId={profile.userID}
                        className="ml-4"
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    profile.verificationStatus === 'identity_verified'
                      ? 'bg-green-100 text-green-800'
                      : profile.verificationStatus === 'email_verified'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(profile.verificationStatus || 'unverified').replace('_', ' ')}
                  </span>
                  <span className="px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                    {profile.membershipTier || 'free'} member
                  </span>
                </div>
                <div className="prose max-w-none">
                  <p className="text-gray-600">{profile.bio || 'No bio yet'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* User's Posts */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Posts</h3>
            {userPosts.length > 0 ? (
              <QuestionList
                posts={userPosts}
                onSelectQuestion={() => {}}
                onLikeTotem={() => {}}
                onRefreshTotem={() => {}}
              />
            ) : (
              <p className="text-gray-600">No posts yet</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 