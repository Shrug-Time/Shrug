// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionList } from '@/components/questions/QuestionList';
import { useRouter } from 'next/navigation';
import { Post } from '@/types/models';
import { PostService } from '@/services/firebase';
import { getTotemLikes } from '@/utils/componentHelpers';

type FeedType = 'for-you' | 'popular' | 'latest';

// Calculate total likes for a post
const calculateTotalLikes = (post: Post) => {
  return post.answers.reduce((sum, answer) => 
    sum + answer.totems.reduce((totemSum, totem) => 
      totemSum + getTotemLikes(totem), 0
    ), 0
  );
};

export default function Home() {
  const { user } = useAuth();
  const { toggleLike } = useTotemV2();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedType>('latest');
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
            result = await PostService.getPosts('lastInteraction', 10);
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

        // Sort posts by total likes within each tab
        const sortedPosts = [...result.items].sort((a, b) => {
          const aLikes = calculateTotalLikes(a);
          const bLikes = calculateTotalLikes(b);
          return bLikes - aLikes;
        });

        setPosts(sortedPosts);
      } catch (error) {
        console.error('Error fetching posts:', error);
        // Set empty posts array on error
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [user?.uid, activeTab]);

  const handleWantToAnswer = (post: Post) => {
    router.push(`/post/${post.id}`);
  };

  const handleTotemLikeClick = async (post: Post, answerIdx: number, totemName: string) => {
    await toggleLike(post.id, totemName);
  };

  const handleTotemUnlikeClick = async (post: Post, answerIdx: number, totemName: string) => {
    await toggleLike(post.id, totemName);
  };

  return (
    <main className="container mx-auto px-4 py-8">
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
        hasNextPage={false}
        isLoading={isLoading}
        onLoadMore={() => {}}
      />
    </main>
  );
}