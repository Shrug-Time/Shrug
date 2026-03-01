// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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

const PAGE_SIZE = 15;

export default function Home() {
  const { user } = useAuth();
  const { toggleLike } = useTotem();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedType>('latest');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const lastVisibleRef = useRef<any>(null);
  const router = useRouter();
  const { shouldShowModal, isModalOpen, closeModal } = useIntroductionModal();

  const fetchPosts = useCallback(async (tab: FeedType, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      lastVisibleRef.current = null;
    }

    try {
      let result: { posts: Post[]; lastVisible: any };

      switch (tab) {
        case 'latest':
          result = await PostService.getPaginatedPosts(
            [],
            PAGE_SIZE,
            append ? lastVisibleRef.current : null
          );
          break;

        case 'popular':
          result = await PostService.getPopularPosts(
            PAGE_SIZE,
            append ? lastVisibleRef.current : null
          );
          break;

        case 'for-you':
          if (user?.uid) {
            result = await PostService.getUserAnswers(
              user.uid,
              PAGE_SIZE,
              append ? lastVisibleRef.current : null
            );
          } else {
            result = await PostService.getPaginatedPosts([], PAGE_SIZE, null);
          }
          break;

        default:
          result = await PostService.getPaginatedPosts([], PAGE_SIZE, null);
      }

      const fetched = result.posts || [];
      lastVisibleRef.current = result.lastVisible;
      setHasNextPage(fetched.length >= PAGE_SIZE && result.lastVisible != null);

      if (append) {
        setPosts(prev => [...prev, ...fetched]);
      } else {
        setPosts(fetched);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      if (!append) setPosts([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user?.uid]);

  // Initial load & tab change
  useEffect(() => {
    fetchPosts(activeTab);
  }, [activeTab, fetchPosts]);

  // Refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && posts.length > 0) {
        fetchPosts(activeTab);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [posts.length, activeTab, fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasNextPage) {
      fetchPosts(activeTab, true);
    }
  }, [isLoadingMore, hasNextPage, activeTab, fetchPosts]);

  const handleWantToAnswer = (post: Post) => {
    router.push(`/post/${post.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainPageSidebar
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />

      <main>
        {shouldShowModal && (
          <WelcomeHeader onDismiss={closeModal} />
        )}

        <div className="max-w-4xl lg:ml-64 mx-auto px-4 py-8 transition-[margin] duration-300">
          <div className="flex flex-wrap gap-2 sm:space-x-4 sm:gap-0 mb-6">
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
            hasNextPage={hasNextPage}
            isLoading={isLoading || isLoadingMore}
            onLoadMore={handleLoadMore}
            sortByCrispness={false}
          />
        </div>
      </main>
    </div>
  );
}
