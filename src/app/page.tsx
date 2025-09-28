// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionList } from '@/components/questions/QuestionList';
import { MainPageSidebar } from '@/components/layout/MainPageSidebar';
import { useRouter } from 'next/navigation';
import { Post } from '@/types/models';
import { PostService } from '@/services/standardized';
import { getTotemLikes } from '@/utils/componentHelpers';
import { QueryConstraint } from 'firebase/firestore';
import { WelcomeHeader } from '@/components/common/WelcomeHeader';
import { useIntroductionModal } from '@/hooks/useIntroductionModal';

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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const router = useRouter();
  const { shouldShowModal, isModalOpen, closeModal } = useIntroductionModal();

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        let fetchedPosts: Post[] = [];
        
        switch (activeTab) {
          case 'latest':
            // Get more posts and let QuestionList handle crispness-based sorting
            const latestResult = await PostService.getPaginatedPosts(
              [], // No additional constraints
              50  // Get more posts for better sorting selection
            );
            fetchedPosts = latestResult.posts || [];
            break;
            
          case 'popular':
            // Use the new scalable popular posts method
            const popularResult = await PostService.getPopularPosts(10);
            fetchedPosts = popularResult.posts || [];
            break;
            
          case 'for-you':
            if (user?.uid) {
              // Get ONLY posts where user has answered (not questions they asked)
              const userAnswersResult = await PostService.getUserAnswers(user.uid, 10);
              fetchedPosts = userAnswersResult.posts || [];
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

  // Force refresh when navigating back to main page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && posts.length > 0) {
        console.log('[MainPage] Tab became visible - refreshing posts');
        // Trigger a re-fetch by updating the dependency
        const fetchPosts = async () => {
          setIsLoading(true);
          try {
            let fetchedPosts: Post[] = [];
            
            switch (activeTab) {
              case 'latest':
                const latestResult = await PostService.getPaginatedPosts([], 50);
                fetchedPosts = latestResult.posts || [];
                break;
                
              case 'popular':
                const popularResult = await PostService.getPopularPosts(10);
                fetchedPosts = popularResult.posts || [];
                break;
                
              case 'for-you':
                if (user?.uid) {
                  // Get ONLY posts where user has answered (not questions they asked)
                  const userAnswersResult = await PostService.getUserAnswers(user.uid, 10);
                  fetchedPosts = userAnswersResult.posts || [];
                }
                break;
            }
            
            setPosts(fetchedPosts);
          } catch (error) {
            console.error('Error refreshing posts:', error);
          } finally {
            setIsLoading(false);
          }
        };
        
        fetchPosts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [posts.length, activeTab, user?.uid]);


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
    <div className="min-h-screen bg-gray-50">
      <MainPageSidebar 
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />
      
      <main>
        {/* Welcome Header - shows above everything for first-time users */}
        {shouldShowModal && (
          <WelcomeHeader onDismiss={closeModal} />
        )}
        
        <div className="max-w-4xl ml-64 px-4 py-8">
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
            sortByCrispness={false}
          />
        </div>
      </main>

    </div>
  );
}