"use client";

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { UserProfile, Post } from '@/types/models';
import { QuestionList } from '@/components/questions/QuestionList';
import { useUser } from '@/hooks/useUser';

export default function ProfilePage() {
  const { profile, isLoading: isLoadingProfile, error: profileError, updateProfile } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    bio: ''
  });
  const [activeTab, setActiveTab] = useState<'public' | 'answers'>('public');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userAnswers, setUserAnswers] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const router = useRouter();

  // Simple function to load user's posts
  const loadUserPosts = async () => {
    if (!profile?.firebaseUid) return;
    
    setIsLoadingPosts(true);
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('firebaseUid', '==', profile.firebaseUid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      setUserPosts(posts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Simple function to load posts where user has answered
  const loadUserAnswers = async () => {
    if (!profile?.firebaseUid) return;
    
    setIsLoadingPosts(true);
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('answerUserIds', 'array-contains', profile.firebaseUid),
        orderBy('lastEngagement', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      setUserAnswers(posts);
    } catch (error) {
      console.error('Error loading answers:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Load data when profile changes
  useEffect(() => {
    if (profile?.firebaseUid) {
      if (activeTab === 'public') {
        loadUserPosts();
      } else {
        loadUserAnswers();
      }
    }
  }, [profile?.firebaseUid, activeTab]);

  const handleWantToAnswer = (post: Post) => {
    router.push(`/post/${post.id}`);
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
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'public' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Questions
          </button>
          <button
            onClick={() => setActiveTab('answers')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'answers' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Answers
          </button>
        </div>

        {activeTab === 'public' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Your Questions</h3>
              {isLoadingPosts ? (
                <p className="text-gray-600">Loading questions...</p>
              ) : userPosts.length > 0 ? (
                <QuestionList
                  posts={userPosts}
                  onWantToAnswer={handleWantToAnswer}
                  hasNextPage={false}
                  isLoading={false}
                  onLoadMore={() => {}}
                  showAllTotems={false}
                />
              ) : (
                <p className="text-gray-600">No questions yet</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Your Answers</h2>
              {isLoadingPosts ? (
                <p className="text-gray-600">Loading answers...</p>
              ) : userAnswers.length > 0 ? (
                <QuestionList
                  posts={userAnswers}
                  onWantToAnswer={handleWantToAnswer}
                  hasNextPage={false}
                  isLoading={false}
                  onLoadMore={() => {}}
                  showAllTotems={false}
                  showUserAnswers={true}
                />
              ) : (
                <p className="text-gray-600">No answers yet</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 