import { useInfiniteQuery } from '@tanstack/react-query';
import { PostService } from '@/services/firebase';
import type { Post } from '@/types/models';
import { where } from 'firebase/firestore';

interface UsePostsOptions {
  userId?: string;
  username?: string;
  firebaseUid?: string;
  totemName?: string;
  pageSize?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function usePosts({ userId, username, firebaseUid, totemName, pageSize = 10 }: UsePostsOptions = {}) {
  const fetchPosts = async ({ pageParam = null }) => {
    let retries = 0;
    
    console.log(`[usePosts] Fetching posts with params:`, { userId, username, firebaseUid, totemName, pageSize, pageParam });
    
    while (retries < MAX_RETRIES) {
      try {
        if (firebaseUid) {
          console.log(`[usePosts] Fetching posts for Firebase UID: ${firebaseUid}`);
          const posts = await PostService.getUserPosts(firebaseUid);
          console.log(`[usePosts] Fetched ${posts.length} posts for Firebase UID ${firebaseUid}`);
          return { items: posts, lastDoc: null };
        } else if (username) {
          console.log(`[usePosts] Fetching posts for username: ${username}`);
          const posts = await PostService.getUserPosts(username);
          console.log(`[usePosts] Fetched ${posts.length} posts for username ${username}`);
          return { items: posts, lastDoc: null };
        } else if (userId) {
          // For backward compatibility
          console.log(`[usePosts] Fetching posts for legacy userId: ${userId}`);
          const posts = await PostService.getUserPosts(userId);
          console.log(`[usePosts] Fetched ${posts.length} posts for legacy userId ${userId}`);
          return { items: posts, lastDoc: null };
        }
        
        if (totemName) {
          console.log(`[usePosts] Fetching posts for totem: ${totemName}`);
          const filters = [where('totems', 'array-contains', totemName)];
          const result = await PostService.getPaginatedPosts(pageParam, filters);
          console.log(`[usePosts] Fetched ${result.posts.length} posts for totem ${totemName}`);
          return { items: result.posts, lastDoc: result.lastVisible };
        }
        
        throw new Error('Either userId, username, firebaseUid, or totemName must be provided');
      } catch (error) {
        console.error(`[usePosts] Error fetching posts (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
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
    queryKey: ['posts', { userId, username, firebaseUid, totemName, pageSize }],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage?.lastDoc || undefined,
    enabled: Boolean(userId || username || firebaseUid || totemName),
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