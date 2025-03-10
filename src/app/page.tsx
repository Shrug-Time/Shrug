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
import type { Post, UserProfile } from '@/types/models';
import { handleTotemLike, handleTotemRefresh } from '@/utils/totem';

type FeedType = 'for-you' | 'popular' | 'latest';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const [refreshCount, setRefreshCount] = useState(5);
  const [activeTab, setActiveTab] = useState<FeedType>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Function to calculate post score for ranking
  const calculatePostScore = (post: Post) => {
    const now = new Date().getTime();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    let score = 0;

    post.answers.forEach(answer => {
      answer.totems.forEach(totem => {
        // Calculate recency score (decay over time)
        const lastLikeTime = totem.lastLike ? new Date(totem.lastLike).getTime() : 0;
        const timeSinceLike = now - lastLikeTime;
        const recencyScore = Math.max(0, 1 - (timeSinceLike / ONE_WEEK_MS)); // 7-day decay

        // Combine likes and crispness with recency
        score += (totem.likes * 0.6 + (totem.crispness || 0) * 0.4) * recencyScore;
      });
    });

    return score;
  };

  // Function to get personalized feed
  const getPersonalizedFeed = async (posts: Post[]) => {
    if (!userData) return posts;

    // Get posts from followed users
    const followedUsers = userData.following || [];
    const followedPosts = posts.filter(post => 
      post.answers.some(answer => followedUsers.includes(answer.userID))
    );

    // Get posts with high engagement
    const rankedPosts = posts.map(post => ({
      post,
      score: calculatePostScore(post)
    }));

    // Combine and sort posts
    const allPosts = [
      ...followedPosts,
      ...rankedPosts.filter(({ post }) => !followedPosts.includes(post))
        .map(({ post }) => post)
    ];

    // Remove duplicates
    return Array.from(new Set(allPosts));
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const data = await checkOrCreateUser(user);
        setUserData(data as UserProfile);
      } else {
        router.push("/login");
      }
    });

    let unsubscribePosts: () => void;

    if (user) {
      // Posts subscription based on active tab
      const postsRef = collection(db, "posts");
      let postsQuery;

      switch (activeTab) {
        case 'popular':
          // Order by total engagement (likes + refreshes)
          postsQuery = query(postsRef, orderBy("totalEngagement", "desc"), limit(50));
          break;
        case 'for-you':
          // Base query - we'll filter in memory for personalization
          postsQuery = query(postsRef, orderBy("createdAt", "desc"), limit(100));
          break;
        default:
          // Latest posts
          postsQuery = query(postsRef, orderBy("createdAt", "desc"), limit(50));
      }

      unsubscribePosts = onSnapshot(postsQuery, async (snapshot) => {
        let postsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];

        // Apply additional filtering/sorting based on tab
        if (activeTab === 'for-you') {
          postsList = await getPersonalizedFeed(postsList);
        } else if (activeTab === 'popular') {
          postsList.sort((a, b) => calculatePostScore(b) - calculatePostScore(a));
        }

        // Apply search filter if query exists
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

        setPosts(postsList);
      });
    } else {
      setPosts([]);
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribePosts) unsubscribePosts();
    };
  }, [user, router, activeTab, searchQuery]);

  const handleTotemLikeClick = async (postId: string, answerIdx: number, totemName: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      await handleTotemLike(post, answerIdx, totemName, user.uid);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleTotemRefreshClick = async (postId: string, answerIdx: number, totemName: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      const updatedAnswers = await handleTotemRefresh(post, answerIdx, totemName, refreshCount);
      if (updatedAnswers) {
        setRefreshCount(prev => prev - 1);
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        refreshCount={refreshCount}
        isVerified={userData?.verificationStatus === 'email_verified' || userData?.verificationStatus === 'identity_verified'}
        onLogout={() => {
          auth.signOut();
          router.push("/login");
        }}
      />

      <main className="max-w-4xl mx-auto p-6">
        {/* Tab Navigation */}
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

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-4 border rounded-xl bg-white shadow"
          />
        </div>

        {selectedQuestion ? (
          <AnswerForm
            selectedQuestion={selectedQuestion}
            userId={user.uid}
            isVerified={userData?.verificationStatus === 'email_verified' || userData?.verificationStatus === 'identity_verified'}
            onAnswerSubmitted={() => setSelectedQuestion(null)}
          />
        ) : (
          <QuestionList
            posts={posts}
            onSelectQuestion={setSelectedQuestion}
            onLikeTotem={handleTotemLikeClick}
            onRefreshTotem={handleTotemRefreshClick}
          />
        )}
      </main>
    </div>
  );
}