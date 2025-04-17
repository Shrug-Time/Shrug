// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionList } from '@/components/questions/QuestionList';
import { useRouter } from 'next/navigation';
import { Post } from '@/types/models';
import { PostService } from '@/services/standardized';
import { getTotemLikes } from '@/utils/componentHelpers';
import { QueryConstraint } from 'firebase/firestore';
import { AdBanner } from '@/components/ads/AdBanner';

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
  const { toggleLike } = useTotem();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedType>('latest');
  const router = useRouter();

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        let fetchedPosts: Post[] = [];
        
        switch (activeTab) {
          case 'latest':
            // Use standardized service with createdAt ordering
            const latestResult = await PostService.getPaginatedPosts(
              [], // No additional constraints
              10  // Page size
            );
            fetchedPosts = latestResult.posts || [];
            break;
            
          case 'popular':
            // Use standardized service with lastInteraction ordering
            const constraints: QueryConstraint[] = []; // No additional constraints
            const popularResult = await PostService.getPaginatedPosts(
              constraints,
              10
            );
            fetchedPosts = popularResult.posts || [];
            // Sort by total likes (since lastInteraction may not strictly correlate with popularity)
            fetchedPosts = [...fetchedPosts].sort((a, b) => {
              const aLikes = calculateTotalLikes(a);
              const bLikes = calculateTotalLikes(b);
              return bLikes - aLikes;
            });
            break;
            
          case 'for-you':
            if (user?.uid) {
              // Get user's posts
              const userPostsResult = await PostService.getUserPosts(user.uid, 10);
              
              // Get posts user has answered
              const userAnswersResult = await PostService.getUserAnswers(user.uid, 10);
              
              // Combine and deduplicate posts
              const combinedPosts = [
                ...(userPostsResult.posts || []),
                ...(userAnswersResult.posts || [])
              ];
              
              // Remove duplicates by post ID
              const uniquePostIds = new Set<string>();
              fetchedPosts = combinedPosts.filter(post => {
                if (uniquePostIds.has(post.id)) return false;
                uniquePostIds.add(post.id);
                return true;
              });
            } else {
              // Fallback to latest posts if not authenticated
              const fallbackResult = await PostService.getPaginatedPosts([], 10);
              fetchedPosts = fallbackResult.posts || [];
            }
            break;
            
          default:
            const defaultResult = await PostService.getPaginatedPosts([], 10);
            fetchedPosts = defaultResult.posts || [];
        }

        setPosts(fetchedPosts);
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
      <AdBanner />
      
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