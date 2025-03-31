// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth, useLike } from '@/contexts/TotemContext';
import { QuestionList } from '@/components/questions/QuestionList';
import { useRouter } from 'next/navigation';
import { Post } from '@/types/models';
import { PostService } from '@/services/firebase';

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

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toggleLike } = useLike();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedType>('latest');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        let result;
        switch (activeTab) {
          case 'latest':
            result = await PostService.getPosts('createdAt', 10);
            break;
          case 'popular':
            result = await PostService.getPosts('likes', 10);
            break;
          case 'for-you':
            if (user?.uid) {
              const userPosts = await PostService.getUserPosts(user.uid);
              result = { items: userPosts, lastDoc: null };
            } else {
              // Fallback to latest posts if not authenticated
              result = await PostService.getPosts('createdAt', 10);
            }
            break;
          default:
            result = await PostService.getPosts('createdAt', 10);
        }
        setPosts(result.items);
      } catch (error) {
        console.error('Error fetching posts:', error);
        // Set empty posts array on error
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchPosts();
    }
  }, [user?.uid, authLoading, activeTab]);

  const handleWantToAnswer = (post: Post) => {
    router.push(`/post/${post.id}`);
  };

  const handleTotemLikeClick = async (post: Post, answerIdx: number, totemName: string) => {
    await toggleLike(post.id, totemName);
    // Refresh the post data
    const updatedPost = await PostService.getPost(post.id);
    if (updatedPost) {
      setPosts(prevPosts => 
        prevPosts.map(p => p.id === post.id ? updatedPost : p)
      );
    }
  };

  const handleTotemUnlikeClick = async (post: Post, answerIdx: number, totemName: string) => {
    await toggleLike(post.id, totemName);
    // Refresh the post data
    const updatedPost = await PostService.getPost(post.id);
    if (updatedPost) {
      setPosts(prevPosts => 
        prevPosts.map(p => p.id === post.id ? updatedPost : p)
      );
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Questions</h1>
        <button
          onClick={() => setShowCreatePost(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Ask a Question
        </button>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('latest')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'latest' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Latest
        </button>
        <button
          onClick={() => setActiveTab('popular')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'popular' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Popular
        </button>
        <button
          onClick={() => setActiveTab('for-you')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'for-you' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          For You
        </button>
      </div>

      <QuestionList
        posts={posts}
        onWantToAnswer={handleWantToAnswer}
        onLikeTotem={handleTotemLikeClick}
        onUnlikeTotem={handleTotemUnlikeClick}
        hasNextPage={false}
        isLoading={isLoading}
        onLoadMore={() => {}}
      />
    </main>
  );
}