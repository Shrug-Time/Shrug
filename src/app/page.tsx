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
import { handleTotemLike, handleTotemRefresh } from '@/utils/totem';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
    post.answers.some(answer => followedUsers.includes(answer.userId))
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

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
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
              
              // Helper function to safely convert timestamps
              const convertTimestamp = (timestamp: any): Date => {
                if (!timestamp) return new Date();
                if (timestamp.toDate) return timestamp.toDate();
                if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
                if (timestamp instanceof Date) return timestamp;
                return new Date(timestamp);
              };

              return {
                id: doc.id,
                ...data,
                createdAt: convertTimestamp(data.createdAt),
                lastEngagement: convertTimestamp(data.lastEngagement),
                answers: (data.answers || []).map((answer: any) => ({
                  ...answer,
                  createdAt: convertTimestamp(answer.createdAt)
                }))
              };
            }) as Post[];

            if (activeTab === 'for-you' && userData) {
              getPersonalizedFeed(postsList, userData).then(filteredPosts => {
                if (searchQuery) {
                  const query = searchQuery.toLowerCase();
                  filteredPosts = filteredPosts.filter(post => 
                    post.question.toLowerCase().includes(query) ||
                    post.answers.some(answer => 
                      answer.text.toLowerCase().includes(query) ||
                      answer.userName.toLowerCase().includes(query)
                    )
                  );
                }
                resolve(filteredPosts);
              });
            } else {
              if (activeTab === 'popular') {
                postsList.sort((a, b) => calculatePostScore(b) - calculatePostScore(a));
              }

              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                postsList = postsList.filter(post => 
                  post.question.toLowerCase().includes(query) ||
                  post.answers.some(answer => 
                    answer.text.toLowerCase().includes(query) ||
                    answer.userName.toLowerCase().includes(query)
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
    if (!user) return;

    try {
      await handleTotemLike(post, answerIdx, totemName, user.uid);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleTotemRefreshClick = async (post: Post, answerIdx: number, totemName: string) => {
    if (!user) return;

    try {
      const success = await handleTotemRefresh(post, answerIdx, totemName, refreshCount);
      if (success) {
        setRefreshCount(prev => prev - 1);
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
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

      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex space-x-1 bg-white rounded-xl shadow p-1">
            <button
              onClick={() => setActiveTab('latest')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'latest'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => setActiveTab('for-you')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'for-you'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              For You
            </button>
            <button
              onClick={() => setActiveTab('popular')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'popular'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Popular
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 p-4 border rounded-xl bg-white shadow"
          />
          {user && (
            <button
              onClick={() => setIsCreatingPost(true)}
              className="px-6 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 shadow"
            >
              Ask Question
            </button>
          )}
        </div>

        {isCreatingPost ? (
          user ? (
            <CreatePostForm
              userId={user.uid}
              userName={userData?.name || 'Anonymous'}
              onPostCreated={() => {
                setIsCreatingPost(false);
                queryClient.invalidateQueries({ queryKey: ['posts'] });
              }}
              onCancel={() => setIsCreatingPost(false)}
            />
          ) : (
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <p className="text-gray-600 mb-4">Please log in to ask questions</p>
              <button
                onClick={() => setIsCreatingPost(false)}
                className="px-4 py-2 text-blue-600 hover:text-blue-700"
              >
                Back to Questions
              </button>
            </div>
          )
        ) : selectedQuestion ? (
          user ? (
            <AnswerForm
              selectedQuestion={selectedQuestion}
              userId={user.uid}
              isVerified={userData?.verificationStatus === 'email_verified' || userData?.verificationStatus === 'identity_verified'}
              onAnswerSubmitted={() => {
                setSelectedQuestion(null);
                queryClient.invalidateQueries({ queryKey: ['posts'] });
              }}
            />
          ) : (
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <p className="text-gray-600 mb-4">Please log in to answer questions</p>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="px-4 py-2 text-blue-600 hover:text-blue-700"
              >
                Back to Questions
              </button>
            </div>
          )
        ) : (
          <QuestionList
            posts={posts}
            onSelectQuestion={setSelectedQuestion}
            onLikeTotem={handleTotemLikeClick}
            onRefreshTotem={handleTotemRefreshClick}
            showAllTotems={false}
          />
        )}
      </main>
    </div>
  );
}