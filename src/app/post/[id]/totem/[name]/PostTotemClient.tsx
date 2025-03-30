"use client";

import { useState, useEffect, useRef } from 'react';
import { TotemDetail } from '@/components/totem/TotemDetail';
import type { Post, Totem, TotemLike } from '@/types/models';
import { updateTotemLikes, unlikeTotem, refreshUserLike, refreshTotem, getPost } from '@/lib/firebase/posts';
import { auth } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { USER_FIELDS, TOTEM_FIELDS } from '@/constants/fields';
import { hasUserLikedTotem } from '@/utils/componentHelpers';

// Create a global cache to track liked totems across component instances
// This will persist even if the component is unmounted and remounted
const globalLikedTotemsCache: Record<string, Set<string>> = {};

interface PostTotemClientProps {
  initialPost: Post;
  totemName: string;
}

export function PostTotemClient({ initialPost, totemName }: PostTotemClientProps) {
  const [post, setPost] = useState(initialPost);
  const [error, setError] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [originalLikeTimestamp, setOriginalLikeTimestamp] = useState<number | undefined>(undefined);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local cache of liked totems for this user and post
  const likedTotemsRef = useRef<Set<string>>(new Set());
  
  // Initialize the global cache for this user if it doesn't exist
  useEffect(() => {
    if (currentUserId && !globalLikedTotemsCache[currentUserId]) {
      globalLikedTotemsCache[currentUserId] = new Set();
    }
  }, [currentUserId]);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setCurrentUserId(user?.uid || null);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Initialize the local cache from the global cache and post data
  useEffect(() => {
    if (currentUserId) {
      // Check if the user has already liked this totem in our global cache
      if (globalLikedTotemsCache[currentUserId]?.has(totemName)) {
        likedTotemsRef.current.add(totemName);
      }
      
      // Also check the post data to see if the user has already liked the totem
      const answer = post.answers.find(answer => 
        answer.totems.some(totem => totem.name === totemName)
      );
      
      if (answer) {
        const totem = answer.totems.find(totem => totem.name === totemName);
        if (totem) {
          // Check the likeHistory if available
          if (totem.likeHistory && totem.likeHistory.length > 0) {
            const userLike = totem.likeHistory.find(like => 
              like.userId === currentUserId && like.isActive
            );
            
            if (userLike) {
              // User has an active like
              likedTotemsRef.current.add(totemName);
              globalLikedTotemsCache[currentUserId]?.add(totemName);
              
              // Store the original like timestamp for potential refresh prompts
              setOriginalLikeTimestamp(userLike.originalTimestamp);
              
              console.log(`PostTotemClient - User ${currentUserId} has already liked totem ${totemName} (original timestamp: ${new Date(userLike.originalTimestamp).toISOString()})`);
            }
          }
        }
      }
    }
  }, [post, totemName, currentUserId]);

  const handleLikeTotem = async (postId: string, totemName: string) => {
    // Prevent multiple clicks
    if (isLiking) {
      console.log('PostTotemClient - Already processing a like request');
      return;
    }
    
    setIsLiking(true);
    setError(null);
    
    console.log('PostTotemClient - handleLikeTotem called with:', postId, totemName);
    
    try {
      // Check if user is logged in
      if (!currentUserId) {
        setError("You must be logged in to like a totem");
        setIsLiking(false);
        return;
      }
      
      // Check our local cache first (fastest check)
      if (likedTotemsRef.current.has(totemName)) {
        console.log('PostTotemClient - User has already liked this totem (local cache check)');
        setError("You've already liked this totem!");
        setIsLiking(false);
        return;
      }
      
      // If we've passed all checks, add to our caches before making the API call
      // This prevents race conditions where the user clicks multiple times before the API responds
      likedTotemsRef.current.add(totemName);
      if (globalLikedTotemsCache[currentUserId]) {
        globalLikedTotemsCache[currentUserId].add(totemName);
      }
      
      const result = await updateTotemLikes(postId, totemName);
      console.log('PostTotemClient - updateTotemLikes completed successfully:', result);
      
      // Update the local state with the updated post
      if (result && result.post) {
        setPost(result.post);
      } else {
        // Fallback to fetching the post if the result doesn't include it
        const updatedPost = await getPost(postId);
        if (updatedPost) {
          setPost(updatedPost);
        }
      }
    } catch (err) {
      console.error("Error liking totem:", err);
      setError(err instanceof Error ? err.message : "Failed to like totem");
      
      // If there was an error, we should remove the totem from our caches
      // so the user can try again
      likedTotemsRef.current.delete(totemName);
      if (currentUserId && globalLikedTotemsCache[currentUserId]) {
        globalLikedTotemsCache[currentUserId].delete(totemName);
      }
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleUnlikeTotem = async (postId: string, totemName: string) => {
    // Prevent multiple clicks
    if (isLiking) {
      console.log('PostTotemClient - Already processing an unlike request');
      return;
    }
    
    setIsLiking(true);
    setError(null);
    
    console.log('PostTotemClient - handleUnlikeTotem called with:', postId, totemName);
    
    try {
      // Check if user is logged in
      if (!currentUserId) {
        setError("You must be logged in to unlike a totem");
        setIsLiking(false);
        return;
      }
      
      // Remove from our caches before making the API call
      likedTotemsRef.current.delete(totemName);
      if (globalLikedTotemsCache[currentUserId]) {
        globalLikedTotemsCache[currentUserId].delete(totemName);
      }
      
      // Clear the original timestamp since it's no longer relevant
      setOriginalLikeTimestamp(undefined);
      
      const result = await unlikeTotem(postId, totemName);
      console.log('PostTotemClient - unlikeTotem completed successfully:', result);
      
      // Update the local state with the updated post
      if (result && result.post) {
        setPost(result.post);
      } else {
        // Fallback to fetching the post if the result doesn't include it
        const updatedPost = await getPost(postId);
        if (updatedPost) {
          setPost(updatedPost);
        }
      }
    } catch (err) {
      console.error("Error unliking totem:", err);
      setError(err instanceof Error ? err.message : "Failed to unlike totem");
      
      // If there was an error, put the totem back in our caches
      likedTotemsRef.current.add(totemName);
      if (currentUserId && globalLikedTotemsCache[currentUserId]) {
        globalLikedTotemsCache[currentUserId].add(totemName);
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleRefreshTotem = async (postId: string, totemName: string) => {
    setError(null);
    try {
      // This is for general totem refresh (updating crispness)
      const updatedTotem = await refreshTotem(postId, totemName);
      if (!updatedTotem) {
        setError("Failed to refresh totem");
        return;
      }
      
      // Fetch the updated post to get the correct crispness
      const updatedPost = await getPost(postId);
      if (updatedPost) {
        setPost(updatedPost);
      }
    } catch (err) {
      console.error("Error refreshing totem:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh totem");
    }
  };
  
  const handleRefreshUserLike = async (postId: string, totemName: string) => {
    setError(null);
    try {
      // This is specifically for refreshing a user's like timestamp
      const result = await refreshUserLike(postId, totemName);
      console.log('PostTotemClient - refreshUserLike completed successfully:', result);
      
      // Update the original timestamp to now since we've refreshed
      setOriginalLikeTimestamp(Date.now());
      
      // Update the local state with the updated post
      if (result && result.post) {
        setPost(result.post);
      } else {
        // Fallback to fetching the post if the result doesn't include it
        const updatedPost = await getPost(postId);
        if (updatedPost) {
          setPost(updatedPost);
        }
      }
    } catch (err) {
      console.error("Error refreshing user like:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh like");
    }
  };

  const hasUserLiked = (totem: Totem, userId: string): boolean => {
    return totem.likeHistory.some(like => 
      like.userId === userId && like.isActive
    );
  };

  // Don't render anything while checking auth state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <TotemDetail
        totemName={totemName}
        posts={[post]}
        onLikeTotem={handleLikeTotem}
        onUnlikeTotem={handleUnlikeTotem}
        currentUserId={currentUserId}
      />
    </>
  );
} 