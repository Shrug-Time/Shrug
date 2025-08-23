import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { TotemService } from '@/services/totem';
import { UserService } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/types/models';
import { PostService } from '@/services/firebase';
import { TotemRefreshModal } from '@/components/totem/TotemRefreshModal';
import useFirebase from '@/hooks/useFirebase';

interface TotemState {
  isLiked: boolean;
  count: number;
  crispness: number;
  lastCalculated?: number;
}

interface RefreshModalData {
  isOpen: boolean;
  postId: string;
  totemName: string;
  currentCrispness: number;
  answerId?: string;
}

interface TotemContextType {
  toggleLike: (postId: string, totemName: string, answerId?: string) => Promise<boolean>;
  isLiked: (postId: string, totemName: string, answerId?: string) => boolean;
  getLikeCount: (postId: string, totemName: string, answerId?: string) => number;
  getCrispness: (postId: string, totemName: string, answerId?: string) => number | undefined;
  refreshesRemaining: number;
  isLoading: boolean;
  error: Error | null;
  loadPostTotems: (postId: string, totemNames: string[]) => Promise<void>;
  loadTotemState: (postId: string, totemName: string, answerId?: string) => Promise<void>;
}

const TotemContext = createContext<TotemContextType | null>(null);

export function useTotem() {
  const context = useContext(TotemContext);
  if (!context) {
    throw new Error('useTotem must be used within a TotemProvider');
  }
  return context;
}

export function TotemProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [likeState, setLikeState] = useState<Record<string, TotemState>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [refreshesRemaining, setRefreshesRemaining] = useState(0);
  const [refreshData, setRefreshData] = useState<RefreshModalData | null>(null);
  const { db } = useFirebase();

  // Calculate crispness from like history
  // Consider ALL likes (both active and inactive) for crispness calculation
  const calculateCrispnessLocal = (likeHistory: any[]): number => {
    const now = Date.now();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    
    // Only consider ACTIVE likes for crispness calculation
    // Inactive likes represent users who are no longer engaged
    if (!likeHistory || likeHistory.length === 0) return 0;
    
    // Filter to only active likes
    const activeLikes = likeHistory.filter(like => like.isActive);
    
    if (activeLikes.length === 0) return 0;
    
    console.log(`[Crispness] Calculating for ${activeLikes.length} active likes (${likeHistory.length} total)`);
    
    // Calculate individual crispness for each active like based on original timestamp
    const individualCrispnessValues = activeLikes.map(like => {
      const lastUpdated = like.originalTimestamp || like.lastUpdatedAt;
      const timeSinceLike = now - lastUpdated;
      const likeCrispness = Math.max(0, 100 * (1 - (timeSinceLike / ONE_WEEK_MS)));
      
      console.log(`[Crispness] Like timestamp: ${new Date(lastUpdated).toISOString()}, age: ${Math.round(timeSinceLike/86400000)} days, crispness: ${likeCrispness.toFixed(1)}%, active: ${like.isActive}`);
      
      return likeCrispness;
    });

    // Calculate average crispness
    const totalCrispness = individualCrispnessValues.reduce((sum, val) => sum + val, 0);
    const averageCrispness = individualCrispnessValues.length > 0 
      ? totalCrispness / individualCrispnessValues.length 
      : 0;
    
    console.log(`[Crispness] Final calculation: ${averageCrispness.toFixed(1)}% (total: ${totalCrispness.toFixed(1)}, count: ${individualCrispnessValues.length})`);
    
    return parseFloat(averageCrispness.toFixed(2));
  };
  
  // Load user's refresh count on mount
  useEffect(() => {
    if (!user) return;
    
    const loadUserRefreshes = async () => {
      try {
        const userData = await UserService.getUserByFirebaseUid(user.uid);
        
        if (userData) {
          // Check if we need to reset refreshes (new day)
          const now = Date.now();
          const resetTime = userData.refreshResetTime;
          const resetDate = new Date(resetTime);
          const nowDate = new Date(now);
          const isNewDay = nowDate.getDate() !== resetDate.getDate() ||
                          nowDate.getMonth() !== resetDate.getMonth() ||
                          nowDate.getFullYear() !== resetDate.getFullYear();
          
          if (isNewDay) {
            // Reset refreshes for new day
            await UserService.updateRefreshes(user.uid, 5, now);
            setRefreshesRemaining(5);
          } else {
            setRefreshesRemaining(userData.refreshesRemaining);
          }
        }
      } catch (error) {
        console.error('[TotemContext] Error loading user refreshes:', error);
      }
    };
    
    loadUserRefreshes();
  }, [user]);

  // Function to load a single totem's state
  // Track ongoing loads to prevent race conditions
  const loadingRef = useRef<Set<string>>(new Set());
  
  const loadTotemState = useCallback(async (postId: string, totemName: string, answerId?: string) => {
    const loadKey = `${postId}-${totemName}-${answerId || 'default'}`;
    
    // Prevent multiple simultaneous loads of the same totem
    if (loadingRef.current.has(loadKey)) {
      console.log(`[TotemState] Skipping duplicate load for ${totemName} (already loading)`);
      return;
    }
    
    loadingRef.current.add(loadKey);
    if (!user) return;
    
    // Create unique key that includes answerId if provided
    const key = answerId ? `${postId}-${answerId}-${totemName}` : `${postId}-${totemName}`;
    
    // Check if we already have this state and avoid reloading unnecessarily
    if (loadingStates[key]) return; // Already loading this totem
    
    // Track loading state to prevent duplicate loads
    setLoadingStates(prev => ({ ...prev, [key]: true }));

    try {
      // Fetch the post data using the PostService
      const post = await PostService.getPost(postId);
      
      if (!post) {
        return;
      }

      // If answerId is provided, find the specific answer, otherwise find any answer with the totem
      const answer = answerId 
        ? post.answers.find(a => a.id === answerId)
        : post.answers.find(a => 
            a.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
          );
          
      // When answerId is provided, use exact name match for the specific totem in that specific answer
      // Otherwise, use case-insensitive matching for general searches
      const totem = answer?.totems.find(t => 
        answerId 
          ? t.name === totemName  // Exact match when we have a specific answer
          : t.name.toLowerCase() === totemName.toLowerCase()  // Case-insensitive for general search
      );

      if (!totem) {
        return;
      }

      const stack = new Error().stack?.split('\n')[3]?.trim() || 'unknown';
      console.log(`[TotemState] Loading state for ${totemName} (${postId}) answerId: ${answerId} - called from: ${stack}`);
      console.log(`[TotemState] Answer: ${answer?.id}, Totem: ${totem.name}, LikeHistory: ${totem.likeHistory?.length || 0} likes, stored crispness: ${totem.crispness || 0}`);
      
      // Debug: Log the actual like history details
      if (totem.likeHistory && totem.likeHistory.length > 0) {
        totem.likeHistory.forEach((like, index) => {
          console.log(`[TotemState] Like ${index}: firebaseUid=${like.firebaseUid}, isActive=${like.isActive}, currentUser=${user.uid}`);
        });
      }
      
      // Determine if the current user has liked this totem
      // This only checks active likes for UI purposes
      const isLiked = totem.likeHistory?.some(
        like => like.firebaseUid === user.uid && like.isActive
      ) || false;
      
      // Get active like count (only active likes count toward the visible counter)
      const count = totem.likeHistory?.filter(like => like.isActive).length || 0;
      
      // Calculate crispness based on ALL likes (active and inactive)
      // This is different from the UI state but gives better decay behavior
      const calculatedCrispness = calculateCrispnessLocal(totem.likeHistory || []);
      
      // Always use the calculated crispness, never the static value
      const crispness = calculatedCrispness;
      
      console.log(`[TotemState] Calculated values - isLiked: ${isLiked}, count: ${count}, crispness: ${crispness.toFixed(1)}%`);
      
      // Only update if values changed
      setLikeState(prev => {
        const current = prev[key];
        if (current && 
            current.isLiked === isLiked && 
            current.count === count && 
            current.crispness === crispness) {
          return prev; // Return same state if nothing changed
        }
        return {
          ...prev,
          [key]: { 
            isLiked, 
            count, 
            crispness,
            lastCalculated: Date.now() 
          }
        };
      });
    } catch (error) {
      console.error('[TotemContext] Error loading state:', error);
      setError(error as Error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
      // Clean up the loading lock
      loadingRef.current.delete(loadKey);
    }
  }, [user]);

  // Load initial state for all totems in a post
  const loadPostTotems = useCallback(async (postId: string, totemNames: string[]) => {
    if (!user) return;
    if (totemNames.length === 0) return;
    
    // Don't set loading state here to avoid re-renders
    try {
      // Use a limited concurrency approach to avoid too many simultaneous requests
      const batchSize = 5;
      for (let i = 0; i < totemNames.length; i += batchSize) {
        const batch = totemNames.slice(i, i + batchSize);
        await Promise.all(
          batch.map(totemName => loadTotemState(postId, totemName))
        );
      }
    } catch (error) {
      console.error('[TotemContext] Error loading post totems:', error);
      setError(error as Error);
    }
  }, [user, loadTotemState]);

  const toggleLike = useCallback(async (postId: string, totemName: string, answerId?: string) => {
    if (!user) return false;
    
    setIsLoading(true);
    setError(null);
    
    // Create unique key that includes answerId if provided
    const key = answerId ? `${postId}-${answerId}-${totemName}` : `${postId}-${totemName}`;
    const currentState = likeState[key];
    
    // Check if this would be a re-like of a previously liked totem
    try {
      console.log(`[DEBUG] toggleLike - checking for inactive likes: postId=${postId}, totemName=${totemName}, answerId=${answerId}`);
      const hadPreviousLike = await TotemService.hasInactiveLikes(postId, totemName, user.uid, answerId);
      console.log(`[DEBUG] toggleLike - hadPreviousLike: ${hadPreviousLike}, currentState?.isLiked: ${currentState?.isLiked}`);
      
      // Also check if user currently has an active like
      const isCurrentlyLiked = await TotemService.hasUserLiked(postId, totemName, user.uid, answerId);
      console.log(`[DEBUG] toggleLike - isCurrentlyLiked: ${isCurrentlyLiked}`);
      
      if (!currentState?.isLiked && hadPreviousLike) {
        // User is re-liking a totem they previously liked
        console.log(`[DEBUG] toggleLike - showing refresh modal`);
        console.log(`[DEBUG] toggleLike - calling getInactiveLikeCrispness with:`, { postId, totemName, uid: user.uid, answerId });
        const previousCrispness = await TotemService.getInactiveLikeCrispness(postId, totemName, user.uid, answerId);
        console.log(`[DEBUG] toggleLike - getInactiveLikeCrispness returned:`, previousCrispness);
        
        // Show the refresh modal
        setRefreshData({
          isOpen: true,
          postId,
          totemName,
          currentCrispness: previousCrispness,
          answerId, // Add answerId to refresh data
        });
        
        setIsLoading(false);
        return false; // Don't complete the like yet, wait for modal interaction
      }
      
      // Regular like/unlike (no previous like)
      return await completeLikeToggle(postId, totemName, false, answerId);
    } catch (error) {
      console.error('[TotemContext] Error checking previous likes:', error);
      setError(error as Error);
      setIsLoading(false);
      return false;
    }
  }, [user, likeState]);

  const completeLikeToggle = async (postId: string, totemName: string, useRefresh: boolean, answerId?: string) => {
    if (!user) return false;
    
    console.log(`[DEBUG] completeLikeToggle called - postId: ${postId}, totemName: ${totemName}, answerId: ${answerId}, useRefresh: ${useRefresh}`);
    
    // Create unique key that includes answerId if provided
    const key = answerId ? `${postId}-${answerId}-${totemName}` : `${postId}-${totemName}`;
    const currentState = likeState[key];
    
    // Optimistically update UI
    setLikeState(prev => {
      const newIsLiked = !(currentState?.isLiked ?? false);
      const newCount = (currentState?.count ?? 0) + (currentState?.isLiked ? -1 : 1);
      
      // Recalculate crispness based on the new like state
      let newCrispness = currentState?.crispness ?? 0;
      if (newIsLiked && !currentState?.isLiked) {
        // Adding a like - set to 100% for new like
        newCrispness = 100;
      } else if (!newIsLiked && currentState?.isLiked) {
        // Removing a like - set to 0% for unlike
        newCrispness = 0;
      }
      
      return {
        ...prev,
        [key]: {
          isLiked: newIsLiked,
          count: newCount,
          crispness: newCrispness
        }
      };
    });
    
    try {
      let success;
      
      if (useRefresh) {
        // Use a refresh to get 100% crispness
        console.log(`[DEBUG] completeLikeToggle - calling TotemService.refreshToFullCrispness`);
        success = await TotemService.refreshToFullCrispness(postId, totemName, user.uid, answerId);
        
        if (success) {
          // Update user's refresh count
          const newRefreshesRemaining = refreshesRemaining - 1;
          await UserService.updateRefreshes(user.uid, newRefreshesRemaining);
          setRefreshesRemaining(newRefreshesRemaining);
        }
      } else {
        // Regular toggle
        console.log(`[DEBUG] completeLikeToggle - calling TotemService.toggleLike`);
        success = await TotemService.toggleLike(postId, totemName, user.uid, answerId);
      }
      
      console.log(`[DEBUG] completeLikeToggle - operation success: ${success}`);
      
      if (!success) {
        // Revert on failure
        setLikeState(prev => ({
          ...prev,
          [key]: currentState ?? { isLiked: false, count: 0, crispness: 0 }
        }));
      } else {
        // Don't reload state since the backend operation succeeded
        // The optimistic update should be correct
        console.log(`[DEBUG] completeLikeToggle - operation succeeded, keeping optimistic update`);
        
        // However, refresh state after a small delay to ensure consistency
        // This handles cases where other components might trigger reloads
        setTimeout(() => {
          console.log(`[DEBUG] completeLikeToggle - delayed state refresh for consistency`);
          loadTotemState(postId, totemName, answerId);
        }, 500); // 500ms delay to allow Firebase propagation
      }
      return success;
    } catch (error) {
      console.error('[TotemContext] Error toggling like:', error);
      setError(error as Error);
      // Revert on error
      setLikeState(prev => ({
        ...prev,
        [key]: currentState ?? { isLiked: false, count: 0, crispness: 0 }
      }));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseRefreshModal = () => {
    setRefreshData(null);
  };
  
  const handleRestore = async () => {
    console.log(`[DEBUG] handleRestore called`);
    if (!refreshData || !user) {
      console.log(`[DEBUG] handleRestore - early return: refreshData=${!!refreshData}, user=${!!user}`);
      return;
    }
    
    const { postId, totemName, answerId } = refreshData;
    console.log(`[DEBUG] handleRestore - calling TotemService.refreshLike directly to restore previous like`);
    
    // Create unique key for state update
    const key = answerId ? `${postId}-${answerId}-${totemName}` : `${postId}-${totemName}`;
    const currentState = likeState[key];
    
    // Optimistically update UI
    setLikeState(prev => ({
      ...prev,
      [key]: {
        isLiked: true,
        count: (currentState?.count ?? 0) + 1,
        crispness: refreshData.currentCrispness // Use the preserved crispness from the modal
      }
    }));
    
    try {
      // Call refreshLike directly to restore the inactive like
      const success = await TotemService.refreshLike(postId, totemName, user.uid, answerId);
      console.log(`[DEBUG] handleRestore - refreshLike result: ${success}`);
      
      if (!success) {
        // Revert on failure
        setLikeState(prev => ({
          ...prev,
          [key]: currentState ?? { isLiked: false, count: 0, crispness: 0 }
        }));
      }
      
      setRefreshData(null);
      return success;
    } catch (error) {
      console.error('[TotemContext] Error restoring like:', error);
      // Revert on error
      setLikeState(prev => ({
        ...prev,
        [key]: currentState ?? { isLiked: false, count: 0, crispness: 0 }
      }));
      setRefreshData(null);
      return false;
    }
  };
  
  const handleRefresh = async () => {
    if (!refreshData || !user || refreshesRemaining <= 0) return;
    
    const { postId, totemName, answerId } = refreshData;
    const success = await completeLikeToggle(postId, totemName, true, answerId);
    setRefreshData(null);
    return success;
  };

  const isLiked = useCallback((postId: string, totemName: string, answerId?: string) => {
    const key = answerId ? `${postId}-${answerId}-${totemName}` : `${postId}-${totemName}`;
    return likeState[key]?.isLiked ?? false;
  }, [likeState]);

  const getLikeCount = useCallback((postId: string, totemName: string, answerId?: string) => {
    const key = answerId ? `${postId}-${answerId}-${totemName}` : `${postId}-${totemName}`;
    return likeState[key]?.count ?? 0;
  }, [likeState]);

  const getCrispness = useCallback((postId: string, totemName: string, answerId?: string) => {
    // If we don't have state for this post/totem pair, return undefined
    const key = answerId ? `${postId}-${answerId}-${totemName}` : `${postId}-${totemName}`;
    const state = likeState[key];
    
    if (!state || state.crispness === undefined) {
      return undefined;
    }
    
    // Calculate how long it's been since we last calculated crispness
    const now = Date.now();
    const lastCalculated = state.lastCalculated || now;
    const minutesSinceCalculation = (now - lastCalculated) / (60 * 1000);
    
    // Recalculate crispness if it's been more than 5 minutes
    if (minutesSinceCalculation >= 5) {
      // We'll use a simple approximation for real-time decay 
      // rather than fetching from the database again
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      const decayPercent = minutesSinceCalculation / (7 * 24 * 60); // Minutes in a week
      
      // Apply time decay (maximum 1% decay per 5 minutes)
      const decayAmount = Math.min(1, decayPercent) * state.crispness;
      const newCrispness = Math.max(0, state.crispness - decayAmount);
      
      console.log(`[Crispness] Real-time decay after ${minutesSinceCalculation.toFixed(1)} minutes: ${state.crispness.toFixed(1)}% → ${newCrispness.toFixed(1)}%`);
      
      // Instead of updating state immediately, schedule an update
      // This prevents the setState during render error
      setTimeout(() => {
        setLikeState(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            crispness: newCrispness,
            lastCalculated: now
          }
        }));
      }, 0);
      
      return newCrispness;
    }
    
    return state.crispness;
  }, [likeState]);

  const value = {
    toggleLike,
    isLiked,
    getLikeCount,
    getCrispness,
    refreshesRemaining,
    isLoading,
    error,
    loadPostTotems,
    loadTotemState,
  };

  return (
    <TotemContext.Provider value={value}>
      {children}
      
      {refreshData && (
        <TotemRefreshModal
          isOpen={refreshData.isOpen}
          onClose={handleCloseRefreshModal}
          totemName={refreshData.totemName}
          currentCrispness={refreshData.currentCrispness}
          refreshesRemaining={refreshesRemaining}
          onRestore={handleRestore}
          onRefresh={handleRefresh}
        />
      )}
    </TotemContext.Provider>
  );
} 