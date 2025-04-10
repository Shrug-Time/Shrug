import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TotemServiceV2 } from '@/services/totemV2';
import { UserService } from '@/services/userService';
import { TotemRefreshModal } from '@/components/totem/TotemRefreshModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post } from '@/types/models';

interface TotemContextType {
  toggleLike: (postId: string, totemName: string) => Promise<boolean>;
  isLiked: (postId: string, totemName: string) => boolean;
  getLikeCount: (postId: string, totemName: string) => number;
  getCrispness: (postId: string, totemName: string) => number;
  refreshesRemaining: number;
  isLoading: boolean;
  error: Error | null;
  loadPostTotems: (postId: string, totemNames: string[]) => Promise<void>;
}

const TotemContext = createContext<TotemContextType | null>(null);

export function useTotemV2() {
  const context = useContext(TotemContext);
  if (!context) {
    throw new Error('useTotemV2 must be used within a TotemProviderV2');
  }
  return context;
}

export function TotemProviderV2({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [likeState, setLikeState] = useState<Record<string, { isLiked: boolean; count: number; crispness: number }>>({}); 
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [refreshesRemaining, setRefreshesRemaining] = useState(5);
  const [refreshData, setRefreshData] = useState<{
    isOpen: boolean;
    postId: string;
    totemName: string;
    currentCrispness: number;
  } | null>(null);
  
  // Load user's refresh count on mount
  useEffect(() => {
    if (!user) return;
    
    const loadUserRefreshes = async () => {
      try {
        const userData = await UserService.getUserProfile(user.uid);
        
        if (userData) {
          // Check if we need to reset refreshes (new day)
          const now = new Date();
          const resetTime = new Date(userData.refreshResetTime);
          const isNewDay = now.getDate() !== resetTime.getDate() ||
                          now.getMonth() !== resetTime.getMonth() ||
                          now.getFullYear() !== resetTime.getFullYear();
          
          if (isNewDay) {
            // Reset refreshes for new day
            await UserService.updateRefreshes(user.uid, 5, now.toISOString());
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
  const loadTotemState = useCallback(async (postId: string, totemName: string) => {
    if (!user) return;
    
    const key = `${postId}-${totemName}`;
    
    // Check if we already have this state and avoid reloading unnecessarily
    if (loadingStates[key]) return; // Already loading this totem
    
    // Track loading state to prevent duplicate loads
    setLoadingStates(prev => ({ ...prev, [key]: true }));

    try {
      // Fetch the post data directly
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        return;
      }

      const post = postDoc.data() as Post;
      const answer = post.answers.find(a => 
        a.totems.some(t => t.name === totemName)
      );
      const totem = answer?.totems.find(t => t.name === totemName);

      if (!totem) {
        return;
      }

      // Manually check if user has liked this totem
      const isLiked = totem.likeHistory?.some(
        like => like.userId === user.uid && like.isActive
      ) || false;
      
      // Get active like count
      const count = totem.likeHistory?.filter(like => like.isActive).length || 0;
      
      // Calculate crispness based on like age
      const crispness = calculateCrispnessFromLikeHistory(totem.likeHistory || []);
      
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
          [key]: { isLiked, count, crispness }
        };
      });
    } catch (error) {
      console.error('[TotemContext] Error loading state:', error);
      setError(error as Error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }
  }, [user]);

  // Calculate crispness from like history
  const calculateCrispnessFromLikeHistory = (likeHistory: any[]): number => {
    const now = Date.now();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    
    const activeLikes = likeHistory.filter(like => like.isActive);
    if (activeLikes.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    activeLikes.forEach(like => {
      const timeSinceLike = now - like.lastUpdatedAt;
      const weight = Math.max(0, 1 - (timeSinceLike / ONE_WEEK_MS));
      
      weightedSum += weight * (like.value || 1);
      totalWeight += weight;
    });

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  };

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

  const toggleLike = useCallback(async (postId: string, totemName: string) => {
    if (!user) return false;
    
    setIsLoading(true);
    setError(null);
    
    const key = `${postId}-${totemName}`;
    const currentState = likeState[key];
    
    // Check if this would be a re-like of a previously liked totem
    try {
      const hadPreviousLike = await TotemServiceV2.hasInactiveLikes(postId, totemName, user.uid);
      
      if (!currentState?.isLiked && hadPreviousLike) {
        // User is re-liking a totem they previously liked
        const previousCrispness = await TotemServiceV2.getInactiveLikeCrispness(postId, totemName, user.uid);
        
        // Show the refresh modal
        setRefreshData({
          isOpen: true,
          postId,
          totemName,
          currentCrispness: previousCrispness,
        });
        
        setIsLoading(false);
        return false; // Don't complete the like yet, wait for modal interaction
      }
      
      // Regular like/unlike (no previous like)
      return await completeLikeToggle(postId, totemName, false);
    } catch (error) {
      console.error('[TotemContext] Error checking previous likes:', error);
      setError(error as Error);
      setIsLoading(false);
      return false;
    }
  }, [user, likeState]);

  const completeLikeToggle = async (postId: string, totemName: string, useRefresh: boolean) => {
    if (!user) return false;
    
    const key = `${postId}-${totemName}`;
    const currentState = likeState[key];
    
    // Optimistically update UI
    setLikeState(prev => ({
      ...prev,
      [key]: {
        isLiked: !(currentState?.isLiked ?? false),
        count: (currentState?.count ?? 0) + (currentState?.isLiked ? -1 : 1),
        crispness: currentState?.crispness ?? 0
      }
    }));
    
    try {
      let success;
      
      if (useRefresh) {
        // Use a refresh
        success = await TotemServiceV2.refreshLike(postId, totemName, user.uid);
        
        if (success) {
          // Update user's refresh count
          const newRefreshesRemaining = refreshesRemaining - 1;
          await UserService.updateRefreshes(user.uid, newRefreshesRemaining);
          setRefreshesRemaining(newRefreshesRemaining);
        }
      } else {
        // Regular toggle
        success = await TotemServiceV2.toggleLike(postId, totemName, user.uid);
      }
      
      if (!success) {
        // Revert on failure
        setLikeState(prev => ({
          ...prev,
          [key]: currentState ?? { isLiked: false, count: 0, crispness: 0 }
        }));
      } else {
        // Reload the state to ensure we have the latest data
        await loadTotemState(postId, totemName);
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
    if (!refreshData || !user) return;
    
    const { postId, totemName } = refreshData;
    const success = await completeLikeToggle(postId, totemName, false);
    setRefreshData(null);
    return success;
  };
  
  const handleRefresh = async () => {
    if (!refreshData || !user || refreshesRemaining <= 0) return;
    
    const { postId, totemName } = refreshData;
    const success = await completeLikeToggle(postId, totemName, true);
    setRefreshData(null);
    return success;
  };

  const isLiked = useCallback((postId: string, totemName: string) => {
    const key = `${postId}-${totemName}`;
    return likeState[key]?.isLiked ?? false;
  }, [likeState]);

  const getLikeCount = useCallback((postId: string, totemName: string) => {
    const key = `${postId}-${totemName}`;
    return likeState[key]?.count ?? 0;
  }, [likeState]);

  const getCrispness = useCallback((postId: string, totemName: string) => {
    const key = `${postId}-${totemName}`;
    return likeState[key]?.crispness ?? 0;
  }, [likeState]);

  const value = {
    toggleLike,
    isLiked,
    getLikeCount,
    getCrispness,
    refreshesRemaining,
    isLoading,
    error,
    loadPostTotems
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