import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TotemServiceV2 } from '@/services/totemV2';

interface TotemContextType {
  toggleLike: (postId: string, totemName: string) => Promise<boolean>;
  isLiked: (postId: string, totemName: string) => boolean;
  getLikeCount: (postId: string, totemName: string) => number;
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
  const [likeState, setLikeState] = useState<Record<string, { isLiked: boolean; count: number }>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // Function to load a single totem's state
  const loadTotemState = useCallback(async (postId: string, totemName: string) => {
    if (!user) return;
    
    const key = `${postId}-${totemName}`;
    if (loadingStates[key]) return; // Already loading this totem
    
    setLoadingStates(prev => ({ ...prev, [key]: true }));

    try {
      const isLiked = await TotemServiceV2.hasUserLiked(postId, totemName, user.uid);
      const count = await TotemServiceV2.getActiveLikeCount(postId, totemName);
      
      setLikeState(prev => ({
        ...prev,
        [key]: { isLiked, count }
      }));
    } catch (error) {
      console.error('[TotemContext] Error loading state:', error);
      setError(error as Error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }
  }, [user]);

  // Load initial state for all totems in a post
  const loadPostTotems = useCallback(async (postId: string, totemNames: string[]) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await Promise.all(
        totemNames.map(totemName => loadTotemState(postId, totemName))
      );
    } catch (error) {
      console.error('[TotemContext] Error loading post totems:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadTotemState]);

  const toggleLike = useCallback(async (postId: string, totemName: string) => {
    if (!user) return false;
    
    setIsLoading(true);
    setError(null);
    
    const key = `${postId}-${totemName}`;
    const currentState = likeState[key];
    
    // Optimistically update UI
    setLikeState(prev => ({
      ...prev,
      [key]: {
        isLiked: !(currentState?.isLiked ?? false),
        count: (currentState?.count ?? 0) + (currentState?.isLiked ? -1 : 1)
      }
    }));
    
    try {
      const success = await TotemServiceV2.toggleLike(postId, totemName, user.uid);
      if (!success) {
        // Revert on failure
        setLikeState(prev => ({
          ...prev,
          [key]: currentState ?? { isLiked: false, count: 0 }
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
        [key]: currentState ?? { isLiked: false, count: 0 }
      }));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, likeState, loadTotemState]);

  const isLiked = useCallback((postId: string, totemName: string) => {
    const key = `${postId}-${totemName}`;
    return likeState[key]?.isLiked ?? false;
  }, [likeState]);

  const getLikeCount = useCallback((postId: string, totemName: string) => {
    const key = `${postId}-${totemName}`;
    return likeState[key]?.count ?? 0;
  }, [likeState]);

  const value = {
    toggleLike,
    isLiked,
    getLikeCount,
    isLoading,
    error,
    loadPostTotems
  };

  return (
    <TotemContext.Provider value={value}>
      {children}
    </TotemContext.Provider>
  );
} 