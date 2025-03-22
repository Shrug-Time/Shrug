"use client";

import { Post, TotemLike } from '@/types/models';
import { TotemButton } from '@/components/common/TotemButton';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { InfiniteScroll } from '@/components/common/InfiniteScroll';
import { auth } from '@/firebase';
import { useEffect, useState, useCallback } from 'react';
import { TOTEM_FIELDS } from '@/constants/fields';

interface TotemDetailProps {
  totemName: string;
  posts: Post[];
  onLikeTotem: (postId: string, totemName: string) => Promise<void>;
  onUnlikeTotem: (postId: string, totemName: string) => Promise<void>;
  onRefreshTotem: (postId: string, totemName: string) => Promise<void>;
  onRefreshUserLike: (postId: string, totemName: string) => Promise<void>;
  originalLikeTimestamp?: number;
  hasNextPage?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
  isLiked?: boolean;
}

export function TotemDetail({
  totemName,
  posts,
  onLikeTotem,
  onUnlikeTotem,
  onRefreshTotem,
  onRefreshUserLike,
  originalLikeTimestamp,
  hasNextPage = false,
  isLoading = false,
  onLoadMore = () => {},
  isLiked: parentIsLiked,
}: TotemDetailProps) {
  // Get the current user ID
  const currentUserId = auth.currentUser?.uid;
  
  // Track which totems have been liked in this session, now keyed by totemId (postId-totemName)
  const [likedTotems, setLikedTotems] = useState<{ [key: string]: boolean }>({});
  
  // Helper to generate a unique key for each totem instance
  const getTotemKey = useCallback((postId: string, totemName: string) => {
    return `${postId}-${totemName}`;
  }, []);
  
  // Check if a specific totem instance is liked by the current user
  const isTotemLiked = useCallback((totem: any, postId: string) => {
    const totemKey = getTotemKey(postId, totem.name);
    
    // If the parent provided an explicit isLiked value for this specific totem, use that
    if (parentIsLiked !== undefined && totem.name === totemName) {
      console.log(`TotemDetail - Using parent-provided isLiked value for ${totem.name}:`, parentIsLiked);
      return parentIsLiked;
    }
    
    // Debug logs
    console.log(`TotemDetail - isTotemLiked check for totem: ${totem.name}, postId: ${postId}`);
    console.log(`TotemDetail - Current userId:`, currentUserId);
    console.log(`TotemDetail - Local likedTotems state:`, likedTotems);
    console.log(`TotemDetail - Current totem key:`, totemKey);
    console.log(`TotemDetail - Is in local cache:`, likedTotems[totemKey] === true);
    
    // First check our local state (for immediate UI feedback)
    if (likedTotems[totemKey] === true) {
      console.log(`TotemDetail - Totem ${totem.name} is liked based on local state`);
      return true;
    }
    
    // Then check the server data - use both standardized and legacy fields
    const likedBy = totem[TOTEM_FIELDS.LIKED_BY] || totem.likedBy || [];
    console.log(`TotemDetail - LikedBy array for ${totem.name}:`, likedBy);
    console.log(`TotemDetail - Is current user in likedBy array:`, currentUserId ? likedBy.includes(currentUserId) : false);
    
    // Also check likeHistory if available
    if (totem.likeHistory && totem.likeHistory.length > 0 && currentUserId) {
      console.log(`TotemDetail - Checking likeHistory for ${totem.name}`);
      
      const activeLikes = totem.likeHistory.filter((like: TotemLike) => 
        like.userId === currentUserId && like.isActive === true
      );
      console.log(`TotemDetail - Active likes in likeHistory for ${totem.name}:`, activeLikes);
      console.log(`TotemDetail - Found active likes count:`, activeLikes.length);
      
      if (activeLikes.length > 0) {
        console.log(`TotemDetail - Totem ${totem.name} is liked based on likeHistory`);
        return true;
      }
    } else {
      console.log(`TotemDetail - No likeHistory available or it's empty for ${totem.name}`);
    }
    
    const isLikedResult = currentUserId ? likedBy.includes(currentUserId) : false;
    console.log(`TotemDetail - Final isLiked result for ${totem.name} based on likedBy check:`, isLikedResult);
    return isLikedResult;
  }, [currentUserId, likedTotems, parentIsLiked, totemName, getTotemKey]);
  
  // Handle like action with local state update
  const handleLike = useCallback(async (postId: string, totemName: string) => {
    console.log(`TotemDetail - handleLike called for totem: ${totemName}, postId: ${postId}`);
    const totemKey = getTotemKey(postId, totemName);
    console.log(`TotemDetail - Current likedTotems state before like:`, likedTotems);
    
    // Update local state immediately for UI feedback
    setLikedTotems(prev => ({
      ...prev,
      [totemKey]: true
    }));
    console.log(`TotemDetail - Added ${totemName} (${totemKey}) to likedTotems`);
    
    try {
      // Call the parent component's like handler
      console.log(`TotemDetail - Calling onLikeTotem for totem: ${totemName}`);
      await onLikeTotem(postId, totemName);
      console.log(`TotemDetail - onLikeTotem completed successfully`);
    } catch (error) {
      // If there was an error, revert the local state
      console.error('Error liking totem:', error);
      setLikedTotems(prev => {
        const newState = { ...prev };
        delete newState[totemKey];
        console.log(`TotemDetail - Error liking. Removing ${totemName} (${totemKey}) from likedTotems`);
        return newState;
      });
    }
  }, [onLikeTotem, likedTotems, getTotemKey]);
  
  // Handle unlike action with local state update
  const handleUnlike = useCallback(async (postId: string, totemName: string) => {
    console.log(`TotemDetail - handleUnlike called for totem: ${totemName}, postId: ${postId}`);
    const totemKey = getTotemKey(postId, totemName);
    console.log(`TotemDetail - Current likedTotems state before unlike:`, likedTotems);
    console.log(`TotemDetail - onUnlikeTotem function available:`, !!onUnlikeTotem);
    
    // Update local state immediately for UI feedback
    setLikedTotems(prev => {
      const newState = { ...prev };
      delete newState[totemKey];
      console.log(`TotemDetail - Removing ${totemName} (${totemKey}) from likedTotems`);
      return newState;
    });
    
    try {
      // Call the parent component's unlike handler
      console.log(`TotemDetail - Calling onUnlikeTotem for totem: ${totemName}`);
      await onUnlikeTotem(postId, totemName);
      console.log(`TotemDetail - onUnlikeTotem completed successfully`);
    } catch (error) {
      // If there was an error, revert the local state
      console.error('Error unliking totem:', error);
      setLikedTotems(prev => ({
        ...prev,
        [totemKey]: true
      }));
      console.log(`TotemDetail - Error unliking. Adding ${totemName} (${totemKey}) back to likedTotems`);
    }
  }, [onUnlikeTotem, likedTotems, getTotemKey]);
  
  // Handle refresh user like
  const handleRefreshUserLike = useCallback(async (postId: string, totemName: string) => {
    try {
      await onRefreshUserLike(postId, totemName);
    } catch (error) {
      console.error('Error refreshing user like:', error);
    }
  }, [onRefreshUserLike]);
  
  // Debug: Log posts and currentUserId
  useEffect(() => {
    console.log('TotemDetail - Posts:', posts);
    console.log('TotemDetail - CurrentUserId:', currentUserId);
    console.log('TotemDetail - Liked totems in local state before update:', likedTotems);
    
    if (!posts || !currentUserId) return;
    
    // Track all totems with their postId for state initialization
    interface TotemInfo {
      totem: any;
      postId: string;
    }
    
    const totemsToCheck: TotemInfo[] = [];
    posts.forEach(post => {
      post.answers.forEach(answer => {
        answer.totems.forEach(totem => {
          if (totem.name === totemName) {
            totemsToCheck.push({ totem, postId: post.id });
          }
        });
      });
    });
    
    console.log('TotemDetail - Found totems to check:', totemsToCheck.length);
    
    // Initialize likedTotems state from post data
    const newLikedTotems: { [key: string]: boolean } = {};
    
    totemsToCheck.forEach(({ totem, postId }) => {
      const totemKey = getTotemKey(postId, totem.name);
      
      // Check both standardized and legacy liked-by arrays
      const likedBy = totem[TOTEM_FIELDS.LIKED_BY] || totem.likedBy || [];
      
      // Also check likeHistory if available
      if (totem.likeHistory && totem.likeHistory.length > 0) {
        const isLiked = totem.likeHistory.some((like: TotemLike) => 
          like.userId === currentUserId && like.isActive === true
        );
        
        if (isLiked) {
          console.log(`TotemDetail - Found active like for totem ${totem.name} (${totemKey}) in likeHistory`);
          newLikedTotems[totemKey] = true;
        }
      } else if (likedBy.includes(currentUserId)) {
        console.log(`TotemDetail - Found like for totem ${totem.name} (${totemKey}) in likedBy array`);
        newLikedTotems[totemKey] = true;
      }
    });
    
    // Only update state if different from current state
    const currentKeys = Object.keys(likedTotems).sort();
    const newKeys = Object.keys(newLikedTotems).sort();
    
    if (JSON.stringify(currentKeys) !== JSON.stringify(newKeys)) {
      console.log(`TotemDetail - Updating likedTotems from:`, likedTotems);
      console.log(`TotemDetail - Updating likedTotems to:`, newLikedTotems);
      setLikedTotems(newLikedTotems);
    }
    
    // Debug: Check for totems with undefined likedBy
    const totemsWithUndefinedLikedBy = totemsToCheck
      .filter(({ totem }) => !totem.likedBy && !totem[TOTEM_FIELDS.LIKED_BY])
      .map(({ totem }) => totem);
      
    if (totemsWithUndefinedLikedBy.length > 0) {
      console.error('TotemDetail - Totems with undefined likedBy:', totemsWithUndefinedLikedBy);
    }
  }, [posts, currentUserId, totemName, getTotemKey]);
  
  // Filter and sort answers that have this totem
  const sortedAnswers = posts.flatMap(post => 
    post.answers
      .map((answer, index) => {
        const matchingTotem = answer.totems?.find(t => t.name === totemName);
        if (!matchingTotem) return null;
        return {
          post,
          answer,
          answerIndex: index,
          totem: matchingTotem,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  ).sort((a, b) => b.totem.likes - a.totem.likes);

  if (!sortedAnswers.length && !isLoading) {
    return (
      <p className="text-gray-600 text-center py-8">
        No answers found for totem: {totemName}
      </p>
    );
  }

  return (
    <InfiniteScroll
      hasNextPage={hasNextPage}
      isLoading={isLoading}
      onLoadMore={onLoadMore}
      className="space-y-6"
    >
      {sortedAnswers.map(({ post, answer, totem }) => {
        // Debug: Log totem and likedBy
        console.log(`TotemDetail - Totem ${totem.name}:`, totem);
        console.log(`TotemDetail - Totem ${totem.name} likedBy:`, totem.likedBy || totem[TOTEM_FIELDS.LIKED_BY]);
        
        // Check if the current user has already liked this totem
        const isLiked = isTotemLiked(totem, post.id);
        
        console.log(`TotemDetail - Totem ${totem.name} (${post.id}) isLiked:`, isLiked);
        
        // Debug: Check if we're handling the global totem or a specific totem instance
        const isGlobalTotem = totem.name === totemName;
        console.log(`TotemDetail - Is this the global totem (${totemName})? ${isGlobalTotem}`);
        
        // Create the handlers for this specific totem
        const handleLikeForTotem = () => handleLike(post.id, totem.name);
        const handleUnlikeForTotem = () => handleUnlike(post.id, totem.name);
        
        // Debug the handlers
        console.log(`TotemDetail - Creating handlers for ${totem.name}:`);
        console.log(`TotemDetail - onLike handler defined: ${!!handleLikeForTotem}`);
        console.log(`TotemDetail - onUnlike handler defined: ${!!handleUnlikeForTotem}`);
        
        return (
          <article 
            key={`${post.id}-${answer.text}`}
            className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow"
          >
            <Link
              href={`/post/${post.id}`}
              className="block mb-4"
            >
              <h2 className="text-xl font-bold mb-2">
                {post.question}
              </h2>
              <div className="text-gray-600">
                {answer.text}
              </div>
            </Link>

            <div className="flex items-center justify-between">
              <TotemButton
                name={totem.name}
                likes={totem.likes}
                crispness={totem.crispness}
                onLike={handleLikeForTotem}
                onUnlike={handleUnlikeForTotem}
                onRefresh={() => handleRefreshUserLike(post.id, totem.name)}
                isLiked={isLiked}
                originalLikeTimestamp={originalLikeTimestamp}
                postId={post.id}
              />
              
              <div className="text-sm text-gray-500">
                {formatDistanceToNow(answer.createdAt, { addSuffix: true })} by {answer.userName || 'Anonymous'}
              </div>
            </div>
          </article>
        );
      })}
    </InfiniteScroll>
  );
} 