"use client";

import { MouseEvent, memo, useCallback, useMemo, useState, useEffect } from 'react';
import { auth } from '@/firebase';
import { useRouter } from 'next/navigation';

interface TotemButtonProps {
  name: string;
  likes: number;
  crispness?: number;
  onLike?: (e: MouseEvent<HTMLButtonElement>) => Promise<void> | void;
  onUnlike?: (e: MouseEvent<HTMLButtonElement>) => Promise<void> | void;
  onRefresh?: (e: MouseEvent<HTMLButtonElement>) => Promise<void> | void;
  postId?: string;
  isLiked?: boolean;
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
  const [isLikeDisabled, setIsLikeDisabled] = useState(isLiked);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Update the disabled state when isLiked prop changes
  useEffect(() => {
    setIsLikeDisabled(isLiked);
  }, [isLiked]);
  
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
    
    if (isLoading) return;
    
    if (!isAuthenticated) {
      // Not logged in, handle this in the parent component
      if (onLike) onLike(e);
      return;
    }
    
    if (isLikeDisabled && onUnlike) {
      // If already liked and we have an unlike handler, unlike the totem
      setIsLoading(true);
      try {
        await onUnlike(e);
        setIsLikeDisabled(false);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    if (!isLikeDisabled && onLike) {
      // If not liked and we have a like handler, like the totem
      setIsLoading(true);
      try {
        await onLike(e);
        setIsLikeDisabled(true);
        
        // If this is a re-like situation, show the refresh prompt
        if (isReLike) {
          setShowRefreshPrompt(true);
        }
      } finally {
        setIsLoading(false);
      }
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
      <button
        onClick={handleTotemClick}
        className="flex items-center justify-center px-3 py-1 rounded-xl text-white shadow-sm transition-colors hover:shadow-md"
        style={{ backgroundColor }}
      >
        {name}
        
        <span className="ml-2 text-white/90 flex items-center">
          {likes}
        </span>
      </button>
      
      <div className="flex items-center mt-1 space-x-2">
        <button
          onClick={handleLikeClick}
          disabled={isLoading}
          className={`text-xs flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
            isLikeDisabled 
              ? 'bg-red-100 text-red-500 hover:bg-red-200' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title={!isAuthenticated ? "Log in to interact" : isLikeDisabled ? "Unlike this totem" : "Like this totem"}
        >
          {isLikeDisabled ? '❤️' : '♡'}
        </button>
        
        {crispness !== undefined && (
          <button
            onClick={handleRefreshClick}
            disabled={isLoading}
            className="text-xs flex items-center justify-center bg-gray-100 hover:bg-gray-200 w-14 h-6 rounded-full transition-colors text-gray-500"
            title="Refresh crispness"
          >
            {Math.round(crispness)}% fresh
          </button>
        )}
      </div>
      
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