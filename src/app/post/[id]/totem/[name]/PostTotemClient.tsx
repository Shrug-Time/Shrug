"use client";

import { useState, useEffect, useRef } from 'react';
import { TotemDetail } from '@/components/totem/TotemDetail';
import type { Post } from '@/types/models';
import { updateTotemLikes, refreshTotem, getPost } from '@/lib/firebase/posts';
import { auth } from '@/firebase';

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
  const currentUserId = auth.currentUser?.uid;
  
  // Local cache of liked totems for this user and post
  const likedTotemsRef = useRef<Set<string>>(new Set());
  
  // Initialize the global cache for this user if it doesn't exist
  useEffect(() => {
    if (currentUserId && !globalLikedTotemsCache[currentUserId]) {
      globalLikedTotemsCache[currentUserId] = new Set();
    }
  }, [currentUserId]);
  
  // Initialize the local cache from the global cache
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
          const likedBy = totem.likedBy || [];
          if (likedBy.includes(currentUserId)) {
            // Add to both local and global cache
            likedTotemsRef.current.add(totemName);
            globalLikedTotemsCache[currentUserId]?.add(totemName);
            console.log(`PostTotemClient - User ${currentUserId} has already liked totem ${totemName} (from post data)`);
          }
        }
      }
    }
  }, [post, totemName, currentUserId]);

  // Debug: Log the current state of the post and user
  useEffect(() => {
    console.log('PostTotemClient - Current post state:', post);
    console.log('PostTotemClient - Current user ID:', currentUserId);
    console.log('PostTotemClient - Local liked totems cache:', Array.from(likedTotemsRef.current));
    
    if (currentUserId) {
      console.log('PostTotemClient - Global liked totems cache for user:', 
        Array.from(globalLikedTotemsCache[currentUserId] || new Set()));
    }
    
    // Check if the user has already liked the totem
    const answer = post.answers.find(answer => 
      answer.totems.some(totem => totem.name === totemName)
    );
    
    if (answer) {
      const totem = answer.totems.find(totem => totem.name === totemName);
      if (totem) {
        const likedBy = totem.likedBy || [];
        const hasLiked = currentUserId ? likedBy.includes(currentUserId) : false;
        console.log('PostTotemClient - User has liked totem (from post data):', hasLiked);
        console.log('PostTotemClient - Totem likedBy array:', likedBy);
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
      
      // Check our global cache next (in case the component was remounted)
      if (globalLikedTotemsCache[currentUserId]?.has(totemName)) {
        console.log('PostTotemClient - User has already liked this totem (global cache check)');
        setError("You've already liked this totem!");
        setIsLiking(false);
        return;
      }
      
      // Check if user has already liked this totem in our local state
      const answer = post.answers.find(answer => 
        answer.totems.some(totem => totem.name === totemName)
      );
      
      if (answer) {
        const totem = answer.totems.find(totem => totem.name === totemName);
        if (totem) {
          const likedBy = totem.likedBy || [];
          if (likedBy.includes(currentUserId)) {
            console.log('PostTotemClient - User has already liked this totem (post data check)');
            setError("You've already liked this totem!");
            setIsLiking(false);
            return;
          }
        }
      }
      
      // If we've passed all checks, add to our caches before making the API call
      // This prevents race conditions where the user clicks multiple times before the API responds
      likedTotemsRef.current.add(totemName);
      if (globalLikedTotemsCache[currentUserId]) {
        globalLikedTotemsCache[currentUserId].add(totemName);
      }
      
      await updateTotemLikes(postId, totemName);
      console.log('PostTotemClient - updateTotemLikes completed successfully');
      
      // Fetch the updated post to get the correct crispness and like count
      const updatedPost = await getPost(postId);
      if (updatedPost) {
        console.log('PostTotemClient - Received updated post:', updatedPost);
        setPost(updatedPost);
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

  const handleRefreshTotem = async (postId: string, totemName: string) => {
    setError(null);
    try {
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
        onRefreshTotem={handleRefreshTotem}
      />
    </>
  );
} 