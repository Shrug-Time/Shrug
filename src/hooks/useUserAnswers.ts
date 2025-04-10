import { useInfiniteQuery } from '@tanstack/react-query';
import { PostService } from '@/services/firebase';
import type { Post } from '@/types/models';

interface UseUserAnswersOptions {
  firebaseUid: string;
  pageSize?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useUserAnswers({ firebaseUid, pageSize = 10 }: UseUserAnswersOptions) {
  const fetchUserAnswers = async ({ pageParam = null }) => {
    let retries = 0;
    
    console.log(`[useUserAnswers] Fetching answers for user:`, { firebaseUid, pageSize, pageParam });
    
    while (retries < MAX_RETRIES) {
      try {
        const result = await PostService.getUserAnswers(firebaseUid, pageParam);
        console.log(`[useUserAnswers] Fetched ${result.posts.length} answers for user ${firebaseUid}`);
        return { items: result.posts, lastDoc: result.lastVisible };
      } catch (error) {
        console.error(`[useUserAnswers] Error fetching answers (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
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
    queryKey: ['userAnswers', { firebaseUid, pageSize }],
    queryFn: fetchUserAnswers,
    getNextPageParam: (lastPage) => lastPage?.lastDoc || undefined,
    enabled: Boolean(firebaseUid),
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