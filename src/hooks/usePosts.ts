import { useInfiniteQuery } from '@tanstack/react-query';
import { PostService } from '@/services/PostService';
import type { Post } from '@/types/models';

interface UsePostsOptions {
  userId?: string;
  totemName?: string;
  pageSize?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function usePosts({ userId, totemName, pageSize = 10 }: UsePostsOptions = {}) {
  const fetchPosts = async ({ pageParam = null }) => {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        if (userId) {
          return await PostService.getUserAnswers(userId, pageSize, pageParam);
        }
        if (totemName) {
          return await PostService.getPostsByTotem(totemName, pageSize, pageParam);
        }
        throw new Error('Either userId or totemName must be provided');
      } catch (error) {
        retries++;
        if (retries === MAX_RETRIES) {
          throw error;
        }
        
        // Wait before retrying
        await wait(RETRY_DELAY * retries);
        
        // If it's a network error, wait a bit longer
        if (error instanceof Error && 
            (error.message.includes('network') || 
             error.message.includes('ERR_NAME_NOT_RESOLVED'))) {
          await wait(RETRY_DELAY * 2);
        }
      }
    }
  };

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['posts', { userId, totemName, pageSize }],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage?.lastDoc || undefined,
    enabled: Boolean(userId || totemName),
    initialPageParam: null,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  return {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage: Boolean(data?.pages[data.pages.length - 1]?.lastDoc),
    isFetchingNextPage,
    refetch
  };
} 