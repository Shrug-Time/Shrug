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
}: TotemDetailProps) {
  // Get the current user ID
  const currentUserId = auth.currentUser?.uid;
  
  // Track which totems have been liked in this session
  const [likedTotems, setLikedTotems] = useState<Set<string>>(new Set());
  
  // Check if a totem is liked by the current user
  const isTotemLiked = useCallback((totem: any) => {
    // First check our local state (for immediate UI feedback)
    if (likedTotems.has(totem.name)) {
      return true;
    }
    
    // Then check the server data - use both standardized and legacy fields
    const likedBy = totem[TOTEM_FIELDS.LIKED_BY] || totem.likedBy || [];
    
    // Also check likeHistory if available
    if (totem.likeHistory && totem.likeHistory.length > 0 && currentUserId) {
      return totem.likeHistory.some((like: TotemLike) => 
        like.userId === currentUserId && like.isActive
      );
    }
    
    return currentUserId ? likedBy.includes(currentUserId) : false;
  }, [currentUserId, likedTotems]);
  
  // Handle like action with local state update
  const handleLike = useCallback(async (postId: string, totemName: string) => {
    // Update local state immediately for UI feedback
    setLikedTotems(prev => new Set(prev).add(totemName));
    
    try {
      // Call the parent component's like handler
      await onLikeTotem(postId, totemName);
    } catch (error) {
      // If there was an error, revert the local state
      console.error('Error liking totem:', error);
      setLikedTotems(prev => {
        const newSet = new Set(prev);
        newSet.delete(totemName);
        return newSet;
      });
    }
  }, [onLikeTotem]);
  
  // Handle unlike action with local state update
  const handleUnlike = useCallback(async (postId: string, totemName: string) => {
    // Update local state immediately for UI feedback
    setLikedTotems(prev => {
      const newSet = new Set(prev);
      newSet.delete(totemName);
      return newSet;
    });
    
    try {
      // Call the parent component's unlike handler
      await onUnlikeTotem(postId, totemName);
    } catch (error) {
      // If there was an error, revert the local state
      console.error('Error unliking totem:', error);
      setLikedTotems(prev => new Set(prev).add(totemName));
    }
  }, [onUnlikeTotem]);
  
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
    console.log('TotemDetail - Liked totems in local state:', Array.from(likedTotems));
    
    // Check if any totems have undefined likedBy
    const totems = posts.flatMap(post => 
      post.answers.flatMap(answer => 
        answer.totems.filter(totem => totem.name === totemName)
      )
    );
    
    console.log('TotemDetail - Totems:', totems);
    
    // Initialize likedTotems state from post data
    const newLikedTotems = new Set(likedTotems);
    
    totems.forEach(totem => {
      // Check both standardized and legacy liked-by arrays
      const likedBy = totem[TOTEM_FIELDS.LIKED_BY] || totem.likedBy || [];
      
      // Also check likeHistory if available
      if (totem.likeHistory && totem.likeHistory.length > 0 && currentUserId) {
        const isLiked = totem.likeHistory.some((like: TotemLike) => 
          like.userId === currentUserId && like.isActive
        );
        
        if (isLiked) {
          newLikedTotems.add(totem.name);
        }
      } else if (currentUserId && likedBy.includes(currentUserId)) {
        newLikedTotems.add(totem.name);
      }
    });
    
    if (newLikedTotems.size !== likedTotems.size) {
      setLikedTotems(newLikedTotems);
    }
    
    const totemsWithUndefinedLikedBy = totems.filter(totem => !totem.likedBy && !totem[TOTEM_FIELDS.LIKED_BY]);
    if (totemsWithUndefinedLikedBy.length > 0) {
      console.error('TotemDetail - Totems with undefined likedBy:', totemsWithUndefinedLikedBy);
    }
  }, [posts, currentUserId, totemName, likedTotems]);
  
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
        const isLiked = isTotemLiked(totem);
        
        console.log(`TotemDetail - Totem ${totem.name} isLiked:`, isLiked);
        
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
                onLike={() => handleLike(post.id, totemName)}
                onUnlike={() => handleUnlike(post.id, totemName)}
                onRefresh={() => handleRefreshUserLike(post.id, totemName)}
                isLiked={isLiked}
                originalLikeTimestamp={originalLikeTimestamp}
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