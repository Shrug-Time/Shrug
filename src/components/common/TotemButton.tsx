"use client";

import { MouseEvent, memo, useCallback, useMemo, useState, useEffect } from 'react';
import { auth } from '@/firebase';
import { useRouter } from 'next/navigation';

export interface TotemButtonProps {
  name: string;
  likes: number;
  crispness: number;
  isLiked?: boolean;
  onLike?: (e?: any) => void | Promise<void>;
  onUnlike?: (e?: any) => void | Promise<void>;
  onRefresh?: (e?: any) => void | Promise<void>;
  postId?: string;
  originalLikeTimestamp?: number;
}

function TotemButtonBase({ 
  name, 
  likes, 
  crispness, 
  onLike, 
  onUnlike,
  onRefresh, 
  postId, 
  isLiked = false,
  originalLikeTimestamp
}: TotemButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  // Track the local like state to prevent accidental multiple likes
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  
  // Update local state when the parent prop changes
  useEffect(() => {
    console.log(`TotemButton - isLiked prop changed to ${isLiked} for totem ${name}`);
    setLocalIsLiked(isLiked);
  }, [isLiked, name]);
  
  // Debug props on component mount
  useEffect(() => {
    console.log(`TotemButton - Component mounted/updated for ${name}`);
    console.log(`TotemButton - Initial props for ${name}:`, {
      onLike: !!onLike,
      onUnlike: !!onUnlike,
      isLiked: isLiked,
      localIsLiked: localIsLiked
    });
    
    // This helps verify if onUnlike is correctly passed in
    if (isLiked && !onUnlike) {
      console.warn(`TotemButton - WARN: Totem ${name} is liked but no onUnlike handler is provided!`);
    }
  }, [name, onLike, onUnlike, isLiked, localIsLiked]);
  
  // Determine if this is a re-like situation that would benefit from a refresh
  const isReLike = useMemo(() => {
    if (!originalLikeTimestamp) return false;
    
    const now = Date.now();
    const daysSinceLike = (now - originalLikeTimestamp) / (1000 * 60 * 60 * 24);
    
    // If the original like was more than a day ago, show refresh prompt
    return daysSinceLike > 1;
  }, [originalLikeTimestamp]);
  
  const getTotemColor = useCallback((name: string) => {
    switch (name.toLowerCase()) {
      case "all-natural":
        return "#4CAF50";
      case "name brand":
        return "#9C27B0";
      case "chicken-based":
        return "#FFCA28";
      default:
        // Generate a consistent color based on the name
        const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 45%)`;
    }
  }, []);

  const backgroundColor = useMemo(() => getTotemColor(name), [getTotemColor, name]);
  const isAuthenticated = auth.currentUser !== null;

  const handleTotemClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (postId) {
      // If we're in a post context, navigate to the post's totem view
      router.push(`/post/${postId}/totem/${encodeURIComponent(name)}`);
    } else {
      // If we're not in a post context, navigate to the global totem view
      router.push(`/totem/${encodeURIComponent(name)}`);
    }
  };

  const handleLikeClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    console.log(`TotemButton - handleLikeClick STARTED for ${name}`);
    console.log(`TotemButton - Current localIsLiked state: ${localIsLiked}`);
    console.log(`TotemButton - isLoading: ${isLoading}`);
    console.log(`TotemButton - onLike handler available: ${!!onLike}`);
    console.log(`TotemButton - onUnlike handler available: ${!!onUnlike}`);
    
    if (isLoading) {
      console.log(`TotemButton - Ignoring click because isLoading is true`);
      return;
    }
    
    if (!isAuthenticated) {
      console.log(`TotemButton - User not authenticated, delegating to parent`);
      // Not logged in, handle this in the parent component
      if (onLike) onLike(e);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`TotemButton - Set isLoading to true`);
      
      if (localIsLiked) {
        // If already liked, unlike the totem
        console.log(`TotemButton - Trying to UNLIKE totem ${name}`);
        
        if (!onUnlike) {
          console.warn(`TotemButton - Cannot unlike: onUnlike handler not provided for ${name}`);
          console.log(`TotemButton - Available props for ${name}:`, {
            onLike: !!onLike,
            onUnlike: !!onUnlike,
            onRefresh: !!onRefresh,
            isLiked: isLiked,
            originalLikeTimestamp: !!originalLikeTimestamp
          });
          setIsLoading(false);
          return;
        }
        
        // Optimistically update UI
        console.log(`TotemButton - Optimistically setting localIsLiked to false for ${name}`);
        setLocalIsLiked(false);
        
        console.log(`TotemButton - Calling onUnlike handler for ${name}...`);
        await onUnlike(e);
        console.log(`TotemButton - onUnlike handler completed successfully for ${name}`);
      } else {
        // If not liked, like the totem
        console.log(`TotemButton - Trying to LIKE totem ${name}`);
        
        if (!onLike) {
          console.warn(`TotemButton - Cannot like: onLike handler not provided for ${name}`);
          setIsLoading(false);
          return;
        }
        
        // Optimistically update UI
        console.log(`TotemButton - Optimistically setting localIsLiked to true for ${name}`);
        setLocalIsLiked(true);
        
        console.log(`TotemButton - Calling onLike handler for ${name}...`);
        await onLike(e);
        console.log(`TotemButton - onLike handler completed successfully for ${name}`);
        
        // If this is a re-like situation, show the refresh prompt
        if (isReLike) {
          console.log(`TotemButton - This is a re-like, showing refresh prompt`);
          setShowRefreshPrompt(true);
        }
      }
    } catch (error) {
      console.error(`TotemButton - Error ${localIsLiked ? 'unliking' : 'liking'} totem ${name}:`, error);
      // Revert on error
      setLocalIsLiked(!localIsLiked);
    } finally {
      console.log(`TotemButton - Setting isLoading back to false`);
      setIsLoading(false);
    }
  };

  const handleRefreshClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    if (isLoading) return;
    
    if (onRefresh) {
      setIsLoading(true);
      try {
        await onRefresh(e);
        setShowRefreshPrompt(false);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleCloseRefreshPrompt = () => {
    setShowRefreshPrompt(false);
  };

  return (
    <div className="inline-flex flex-col items-center">
      <div className="flex items-center">
        <button
          onClick={handleTotemClick}
          className="flex items-center justify-center px-3 py-1 rounded-l-xl text-white shadow-sm transition-colors hover:shadow-md"
          style={{ backgroundColor }}
        >
          {name}
          
          <span className="ml-2 text-white/90 flex items-center">
            {likes}
          </span>
        </button>
        
        {/* Like button integrated into the totem button */}
        <button
          onClick={handleLikeClick}
          disabled={isLoading}
          className={`flex items-center justify-center h-full px-2 py-1 rounded-r-xl shadow-sm transition-colors ${
            localIsLiked 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-opacity-80 text-white hover:bg-opacity-100'
          }`}
          style={{ backgroundColor: localIsLiked ? undefined : backgroundColor }}
          title={!isAuthenticated ? "Log in to interact" : localIsLiked ? "Unlike this totem" : "Like this totem"}
          data-liked={localIsLiked ? "true" : "false"}
          data-totem-name={name}
          data-testing-id="totem-like-button"
        >
          {localIsLiked ? '❤️' : '♡'}
        </button>
      </div>
      
      {crispness !== undefined && (
        <div className="flex items-center mt-1">
          <button
            onClick={handleRefreshClick}
            disabled={isLoading}
            className="text-xs flex items-center justify-center bg-gray-100 hover:bg-gray-200 w-14 h-6 rounded-full transition-colors text-gray-500"
            title="Refresh crispness"
          >
            {Math.round(crispness)}% fresh
          </button>
        </div>
      )}
      
      {showRefreshPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-2">Refresh Your Like?</h3>
            <p className="mb-4">
              Your like is using your original timestamp from {new Date(originalLikeTimestamp || 0).toLocaleDateString()}.
              Want 100% fresh crispness? Use 1 refresh credit.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseRefreshPrompt}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Keep as is
              </button>
              <button
                onClick={handleRefreshClick}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                Refresh Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoization to prevent unnecessary re-renders
function propsAreEqual(prevProps: TotemButtonProps, nextProps: TotemButtonProps) {
  return (
    prevProps.name === nextProps.name &&
    prevProps.likes === nextProps.likes &&
    prevProps.crispness === nextProps.crispness &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.postId === nextProps.postId &&
    prevProps.originalLikeTimestamp === nextProps.originalLikeTimestamp
  );
}

export const TotemButton = memo(TotemButtonBase, propsAreEqual); 