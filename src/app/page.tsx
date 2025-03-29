// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db, checkOrCreateUser } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, doc, getDocs, getDoc, query, orderBy, limit, where } from "firebase/firestore";
import { QuestionList } from '@/components/questions/QuestionList';
import { Header } from '@/components/common/Header';
import { AnswerForm } from '@/components/answers/AnswerForm';
import { CreatePostForm } from '@/components/posts/CreatePostForm';
import type { Post, UserProfile } from '@/types/models';
import { TotemService } from '@/services/totem';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserService } from '@/services/userService';
import { USER_FIELDS, POST_FIELDS } from '@/constants/fields';
import { extractUserIdentifier } from '@/utils/userIdHelpers';

type FeedType = 'for-you' | 'popular' | 'latest';

// Utility functions
const calculatePostScore = (post: Post) => {
  const now = new Date().getTime();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  let score = 0;

  post.answers.forEach(answer => {
    answer.totems.forEach(totem => {
      const lastLikeTime = totem.lastLike ? new Date(totem.lastLike).getTime() : 0;
      const timeSinceLike = now - lastLikeTime;
      const recencyScore = Math.max(0, 1 - (timeSinceLike / ONE_WEEK_MS));
      score += (totem.likes * 0.6 + (totem.crispness || 0) * 0.4) * recencyScore;
    });
  });

  return score;
};

const getPersonalizedFeed = async (posts: Post[], userData: UserProfile | null) => {
  if (!userData) return posts;

  const followedUsers = userData.following || [];
  const followedPosts = posts.filter(post => 
    post.answers.some(answer => 
      followedUsers.includes(answer.firebaseUid || '') || 
      followedUsers.includes(answer.userId || '') // For backward compatibility
    )
  );

  const rankedPosts = posts.map(post => ({
    post,
    score: calculatePostScore(post)
  }));

  const allPosts = [
    ...followedPosts,
    ...rankedPosts.filter(({ post }) => !followedPosts.includes(post))
      .map(({ post }) => post)
  ];

  return Array.from(new Set(allPosts));
};

// Helper function to get highest totem likes for a post
const getHighestTotemLikes = (post: Post): number => {
  if (!post.answers || post.answers.length === 0) return 0;
  return Math.max(...post.answers.map(answer => 
    Math.max(...(answer.totems || []).map(totem => totem.likes || 0))
  ));
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedType>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshCount, setRefreshCount] = useState(5);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        queryClient.invalidateQueries({ queryKey: ['userData'] });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // User data query
  const { data: userData } = useQuery<UserProfile | null>({
    queryKey: ['userData', user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const data = await checkOrCreateUser(user);
      return data as UserProfile;
    },
    enabled: !!user,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Posts query
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['posts', activeTab, searchQuery],
    queryFn: async () => {
      const postsRef = collection(db, "posts");
      let postsQuery;

      switch (activeTab) {
        case 'popular':
          postsQuery = query(
            postsRef, 
            orderBy("lastEngagement", "desc"), 
            limit(50)
          );
          break;
        case 'for-you':
          postsQuery = query(
            postsRef, 
            orderBy("createdAt", "desc"), 
            limit(100)
          );
          break;
        default: // latest
          postsQuery = query(
            postsRef, 
            orderBy("createdAt", "desc"), 
            limit(50)
          );
      }

      return new Promise<Post[]>((resolve, reject) => {
        const unsubscribe = onSnapshot(
          postsQuery,
          (snapshot) => {
            let postsList = snapshot.docs.map((doc) => {
              const data = doc.data();
              
              // Helper function to safely convert timestamps to milliseconds
              const convertTimestamp = (timestamp: any): number => {
                if (!timestamp) return Date.now();
                if (timestamp.toDate) return timestamp.toDate().getTime();
                if (timestamp.seconds) return timestamp.seconds * 1000;
                if (timestamp instanceof Date) return timestamp.getTime();
                return typeof timestamp === 'number' ? timestamp : Date.now();
              };

              return {
                id: doc.id,
                question: data.question || '',
                firebaseUid: data[USER_FIELDS.FIREBASE_UID] || data[USER_FIELDS.LEGACY_USER_ID_LOWERCASE] || '',
                username: data[USER_FIELDS.USERNAME] || data[USER_FIELDS.LEGACY_USER_ID] || data[USER_FIELDS.LEGACY_USER_NAME] || '',
                name: data[USER_FIELDS.NAME] || data[USER_FIELDS.LEGACY_USER_NAME] || '',
                categories: data.categories || [],
                createdAt: convertTimestamp(data.createdAt),
                updatedAt: convertTimestamp(data.updatedAt || data.createdAt),
                lastInteraction: convertTimestamp(data.lastInteraction || data.lastEngagement || data.createdAt),
                lastEngagement: convertTimestamp(data.lastEngagement || data.lastInteraction || data.createdAt),
                totemAssociations: data.totemAssociations || [],
                answerFirebaseUids: data.answerFirebaseUids || [],
                answerUsernames: data.answerUsernames || [],
                answers: (data.answers || []).map((answer: any) => ({
                  ...answer,
                  // Ensure user fields are properly standardized in answers
                  firebaseUid: answer[USER_FIELDS.FIREBASE_UID] || answer[USER_FIELDS.LEGACY_USER_ID_LOWERCASE] || answer.userId || '',
                  username: answer[USER_FIELDS.USERNAME] || answer[USER_FIELDS.LEGACY_USER_ID] || '',
                  name: answer[USER_FIELDS.NAME] || answer[USER_FIELDS.LEGACY_USER_NAME] || '',
                  createdAt: convertTimestamp(answer.createdAt)
                }))
              } as Post;
            });

            // Sort posts based on active tab
            if (activeTab === 'popular') {
              postsList.sort((a, b) => {
                const aLikes = getHighestTotemLikes(a);
                const bLikes = getHighestTotemLikes(b);
                if (aLikes !== bLikes) return bLikes - aLikes;
                return calculatePostScore(b) - calculatePostScore(a);
              });
            } else if (activeTab === 'latest') {
              postsList.sort((a, b) => b.createdAt - a.createdAt);
            }

            if (activeTab === 'for-you' && userData) {
              getPersonalizedFeed(postsList, userData).then(filteredPosts => {
                if (searchQuery) {
                  const query = searchQuery.toLowerCase();
                  filteredPosts = filteredPosts.filter(post => 
                    post.question.toLowerCase().includes(query) ||
                    post.answers.some(answer => 
                      answer.text.toLowerCase().includes(query) ||
                      answer.username.toLowerCase().includes(query)
                    )
                  );
                }
                resolve(filteredPosts);
              });
            } else {
              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                postsList = postsList.filter(post => 
                  post.question.toLowerCase().includes(query) ||
                  post.answers.some(answer => 
                    answer.text.toLowerCase().includes(query) ||
                    answer.username.toLowerCase().includes(query)
                  )
                );
              }
              resolve(postsList);
            }
          },
          (error) => {
            console.error("Error fetching posts:", error);
            reject(error);
          }
        );

        // Cleanup subscription on unmount
        return () => unsubscribe();
      });
    },
    staleTime: 0, // Disable stale time since we're using real-time updates
  });

  const handleTotemLikeClick = async (post: Post, answerIdx: number, totemName: string) => {
    if (!user?.uid) return;
    try {
      const result = await TotemService.handleTotemLike(post, answerIdx, totemName, user.uid);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      }
    } catch (error) {
      console.error('Error liking totem:', error);
    }
  };

  const handleTotemUnlikeClick = async (post: Post, answerIdx: number, totemName: string) => {
    if (!user?.uid) return;
    try {
      const result = await TotemService.handleTotemLike(post, answerIdx, totemName, user.uid, true);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      }
    } catch (error) {
      console.error('Error unliking totem:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        refreshCount={refreshCount}
        isVerified={userData?.verificationStatus === 'email_verified' || userData?.verificationStatus === 'identity_verified'}
        onLogout={() => auth.signOut()}
        isAuthenticated={!!user}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('latest')}
              className={`px-4 py-2 rounded ${
                activeTab === 'latest' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => setActiveTab('popular')}
              className={`px-4 py-2 rounded ${
                activeTab === 'popular' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Popular
            </button>
            {user && (
              <button
                onClick={() => setActiveTab('for-you')}
                className={`px-4 py-2 rounded ${
                  activeTab === 'for-you' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                For You
              </button>
            )}
          </div>
          <button
            onClick={() => setShowCreatePost(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Post
          </button>
        </div>

        <QuestionList
          posts={posts}
          onSelectQuestion={setSelectedQuestion}
          onLikeTotem={handleTotemLikeClick}
          onUnlikeTotem={handleTotemUnlikeClick}
          currentUserId={user?.uid || null}
          hasNextPage={false}
          isLoading={false}
          onLoadMore={() => {}}
        />

        {showCreatePost && userData && (
          <CreatePostForm
            firebaseUid={userData.firebaseUid ?? ''}
            username={userData.username ?? ''}
            name={userData.name ?? ''}
            onPostCreated={() => {
              setShowCreatePost(false);
              queryClient.invalidateQueries({ queryKey: ['posts'] });
            }}
            onCancel={() => setShowCreatePost(false)}
          />
        )}

        {selectedQuestion && user && userData ? (
          <AnswerForm
            selectedQuestion={selectedQuestion}
            firebaseUid={userData.firebaseUid ?? ''}
            username={userData.username ?? ''}
            name={userData.name ?? ''}
            isVerified={userData.verificationStatus === 'email_verified'}
            onAnswerSubmitted={() => {
              setSelectedQuestion(null);
              queryClient.invalidateQueries({ queryKey: ['posts'] });
            }}
          />
        ) : selectedQuestion ? (
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-gray-600 mb-4">Please log in to answer questions</p>
            <button
              onClick={() => setSelectedQuestion(null)}
              className="px-4 py-2 text-blue-600 hover:text-blue-700"
            >
              Back to Questions
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}