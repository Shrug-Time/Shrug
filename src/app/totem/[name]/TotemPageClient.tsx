'use client';

import { TotemDetail } from '@/components/totem/TotemDetail';
import { Post } from '@/types/models';
import { useState, useEffect } from 'react';
import { updateTotemLikes, refreshTotem, getPost, unlikeTotem, refreshUserLike } from '@/lib/firebase/posts';
import { auth } from '@/firebase';

interface TotemPageClientProps {
  initialPosts: Post[];
  totemName: string;
}

export function TotemPageClient({ initialPosts, totemName }: TotemPageClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [originalLikeTimestamp, setOriginalLikeTimestamp] = useState<number | undefined>(undefined);
  
  // Track likes for multiple totems by postId
  const [likedTotems, setLikedTotems] = useState<{ [key: string]: boolean }>({});
  
  // Helper to generate a unique key for each totem instance
  const getTotemKey = (postId: string, totemName: string) => {
    return `${postId}-${totemName}`;
  };

  // Initialize isLiked state based on post data
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const currentUserId = auth.currentUser.uid;
    console.log("Initializing isLiked state - Current userId:", currentUserId);
    
    // Initialize separate tracking for each totem instance
    const initialLikedTotems: { [key: string]: boolean } = {};
    
    // Check all posts for this totem to see if the user has liked it
    let anyLiked = false;
    let firstLikeTimestamp: number | undefined = undefined;
    
    for (const post of posts) {
      for (const answer of post.answers) {
        const totem = answer.totems.find(t => t.name === totemName);
        if (totem) {
          const totemKey = getTotemKey(post.id, totemName);
          console.log(`Checking totem ${totemName} (${totemKey}) for likes`);
          const likedBy = totem.likedBy || [];
          
          // Check likeHistory for active likes by this user
          if (totem.likeHistory && totem.likeHistory.length > 0) {
            const userActiveLike = totem.likeHistory.find(like => 
              like.userId === currentUserId && like.isActive === true
            );
            
            if (userActiveLike) {
              console.log(`Found active like in likeHistory for ${totemKey}, setting liked to true`);
              initialLikedTotems[totemKey] = true;
              anyLiked = true;
              
              // Store the timestamp of the first liked totem we find
              if (!firstLikeTimestamp) {
                firstLikeTimestamp = typeof userActiveLike.originalTimestamp === 'string' 
                  ? new Date(userActiveLike.originalTimestamp).getTime() 
                  : userActiveLike.originalTimestamp;
              }
            } else {
              initialLikedTotems[totemKey] = false;
            }
          }
          // Also check the likedBy array as a fallback
          else if (likedBy.includes(currentUserId)) {
            console.log(`Found user ID in likedBy array for ${totemKey}, setting liked to true`);
            initialLikedTotems[totemKey] = true;
            anyLiked = true;
          } else {
            initialLikedTotems[totemKey] = false;
          }
        }
      }
    }
    
    // Update the liked totems state
    setLikedTotems(initialLikedTotems);
    
    // Also update the global isLiked state (for backward compatibility)
    setIsLiked(anyLiked);
    setOriginalLikeTimestamp(firstLikeTimestamp);
    
    console.log("Initialized liked totems:", initialLikedTotems);
    console.log("Global isLiked state:", anyLiked);
  }, [posts, totemName]);

  const handleLikeTotem = async (postId: string, totemName: string) => {
    setError(null);
    console.log(`TotemPageClient - handleLikeTotem called for totem: ${totemName}, postId: ${postId}`);
    const totemKey = getTotemKey(postId, totemName);
    console.log(`TotemPageClient - Current likedTotems state before like:`, likedTotems);
    
    try {
      // Update local state for this specific totem
      setLikedTotems(prev => ({
        ...prev,
        [totemKey]: true
      }));
      
      // Also update global isLiked state for backward compatibility
      setIsLiked(true);
      
      const result = await updateTotemLikes(postId, totemName);
      console.log(`TotemPageClient - updateTotemLikes result:`, result);
      
      if (result && result.post) {
        console.log(`TotemPageClient - Using post from result:`, result.post.id);
        
        const answer = result.post.answers.find(answer => answer.totems.some(totem => totem.name === totemName));
        const totem = answer?.totems.find(totem => totem.name === totemName);
        if (totem) {
          console.log(`TotemPageClient - Updated totem likedBy:`, totem.likedBy || []);
          console.log(`TotemPageClient - Updated totem likeHistory:`, totem.likeHistory || []);
          
          if (result.action === 'like' && totem.likeHistory && totem.likeHistory.length > 0) {
            const currentUserLike = totem.likeHistory.find(like => 
              like.userId === auth.currentUser?.uid && like.isActive === true
            );
            if (currentUserLike) {
              console.log(`TotemPageClient - Found active like, setting originalLikeTimestamp`);
              setOriginalLikeTimestamp(typeof currentUserLike.originalTimestamp === 'string' 
                ? new Date(currentUserLike.originalTimestamp).getTime() 
                : currentUserLike.originalTimestamp);
            }
          }
        }
        
        setPosts(prevPosts => {
          const newPosts = prevPosts.map(post => post.id === postId ? (result.post as Post) : post);
          console.log(`TotemPageClient - Updated posts state after like:`, newPosts.map(p => p.id));
          return newPosts;
        });
        return;
      }
      
      const updatedPost = await getPost(postId);
      if (updatedPost) {
        console.log(`TotemPageClient - Updated post retrieved:`, updatedPost.id);
        
        const answer = updatedPost.answers.find(answer => answer.totems.some(totem => totem.name === totemName));
        const totem = answer?.totems.find(totem => totem.name === totemName);
        if (totem) {
          console.log(`TotemPageClient - Updated totem likedBy:`, totem.likedBy || []);
          console.log(`TotemPageClient - Updated totem likeHistory:`, totem.likeHistory || []);
        }
        
        setPosts(prevPosts => {
          const newPosts = prevPosts.map(post => post.id === postId ? updatedPost : post);
          console.log(`TotemPageClient - Updated posts state after like (using getPost):`, newPosts.map(p => p.id));
          return newPosts;
        });
      }
    } catch (err) {
      // Revert local state for this specific totem
      setLikedTotems(prev => ({
        ...prev,
        [totemKey]: false
      }));
      
      // Also update global isLiked state based on remaining likes
      const hasRemainingLikes = Object.entries(likedTotems)
        .some(([key, isLiked]) => key !== totemKey && isLiked);
      setIsLiked(hasRemainingLikes);
      
      console.error("Error liking totem:", err);
      setError(err instanceof Error ? err.message : "Failed to like totem");
    }
  };

  const handleUnlikeTotem = async (postId: string, totemName: string) => {
    setError(null);
    console.log(`TotemPageClient - handleUnlikeTotem called for totem: ${totemName}, postId: ${postId}`);
    const totemKey = getTotemKey(postId, totemName);
    console.log(`TotemPageClient - Current likedTotems state before unlike:`, likedTotems);
    console.log(`TotemPageClient - Current user: ${auth.currentUser?.uid}`);
    console.log(`TotemPageClient - Is this totem currently liked? ${likedTotems[totemKey] === true}`);
    
    // If the totem is not marked as liked in our state, log a warning
    if (likedTotems[totemKey] !== true) {
      console.warn(`TotemPageClient - Warning: Attempting to unlike a totem (${totemKey}) that is not marked as liked in our state`);
    }
    
    try {
      // Update local state for this specific totem first
      console.log(`TotemPageClient - Updating local state to remove like for ${totemKey}`);
      setLikedTotems(prev => {
        const newState = { ...prev };
        delete newState[totemKey];
        // or explicitly set to false: newState[totemKey] = false;
        return newState;
      });
      
      // Calculate if any other totems are still liked after this change
      const otherLikedTotems = Object.entries(likedTotems)
        .filter(([key, isLiked]) => key !== totemKey && isLiked);
      
      const hasRemainingLikes = otherLikedTotems.length > 0;
      console.log(`TotemPageClient - Other liked totems after update:`, otherLikedTotems);
      console.log(`TotemPageClient - Has remaining likes: ${hasRemainingLikes}`);
      
      // Also update global isLiked state based on remaining likes
      setIsLiked(hasRemainingLikes);
      console.log(`TotemPageClient - Updated global isLiked state to: ${hasRemainingLikes}`);
      
      if (!hasRemainingLikes) {
        console.log(`TotemPageClient - No more liked totems, clearing originalLikeTimestamp`);
        setOriginalLikeTimestamp(undefined);
      }
      
      console.log(`TotemPageClient - Calling unlikeTotem API function for ${totemKey}`);
      const result = await unlikeTotem(postId, totemName);
      console.log(`TotemPageClient - unlikeTotem result:`, result);
      
      if (result && result.post) {
        console.log(`TotemPageClient - Using post from result:`, result.post.id);
        
        const answer = result.post.answers.find(answer => answer.totems.some(totem => totem.name === totemName));
        const totem = answer?.totems.find(totem => totem.name === totemName);
        if (totem) {
          console.log(`TotemPageClient - Updated totem ${totemName} likedBy after unlike:`, totem.likedBy || []);
          console.log(`TotemPageClient - Updated totem ${totemName} likeHistory after unlike:`, totem.likeHistory || []);
          
          // Check if the unlike was successful by looking at the likeHistory
          if (totem.likeHistory) {
            const currentUserLikes = totem.likeHistory.filter(like => 
              like.userId === auth.currentUser?.uid && like.isActive === true
            );
            console.log(`TotemPageClient - Current user's active likes after unlike for ${totemName}:`, currentUserLikes);
            
            // If we still have active likes, something went wrong
            if (currentUserLikes.length > 0) {
              console.warn(`TotemPageClient - Unlike operation did not deactivate all likes for ${totemName}`);
            }
          }
        }
        
        console.log(`TotemPageClient - Updating posts state with new post data`);
        setPosts(prevPosts => {
          const newPosts = prevPosts.map(post => post.id === postId ? (result.post as Post) : post);
          console.log(`TotemPageClient - Updated posts state after unlike:`, newPosts.map(p => p.id));
          return newPosts;
        });
        console.log(`TotemPageClient - Unlike operation completed successfully for ${totemName}`);
        return;
      }
      
      console.log(`TotemPageClient - No post returned in result, fetching updated post`);
      const updatedPost = await getPost(postId);
      if (updatedPost) {
        console.log(`TotemPageClient - Updated post retrieved:`, updatedPost.id);
        
        const answer = updatedPost.answers.find(answer => answer.totems.some(totem => totem.name === totemName));
        const totem = answer?.totems.find(totem => totem.name === totemName);
        if (totem) {
          console.log(`TotemPageClient - Updated totem ${totemName} likedBy after unlike:`, totem.likedBy || []);
          console.log(`TotemPageClient - Updated totem ${totemName} likeHistory after unlike:`, totem.likeHistory || []);
        }
        
        setPosts(prevPosts => {
          const newPosts = prevPosts.map(post => post.id === postId ? updatedPost : post);
          console.log(`TotemPageClient - Updated posts state after unlike (using getPost):`, newPosts.map(p => p.id));
          return newPosts;
        });
      }
    } catch (err) {
      console.error(`TotemPageClient - Error unliking totem ${totemName}:`, err);
      
      // Revert our local state on error
      console.log(`TotemPageClient - Reverting local state due to error`);
      setLikedTotems(prev => ({
        ...prev,
        [totemKey]: true
      }));
      setIsLiked(true);
      setError(err instanceof Error ? err.message : "Failed to unlike totem");
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
      
      const updatedPost = await getPost(postId);
      if (updatedPost) {
        setPosts(prevPosts => 
          prevPosts.map(post => post.id === postId ? updatedPost : post)
        );
      }
    } catch (err) {
      console.error("Error refreshing totem:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh totem");
    }
  };

  const handleRefreshUserLike = async (postId: string, totemName: string) => {
    setError(null);
    try {
      const result = await refreshUserLike(postId, totemName);
      
      const updatedPost = await getPost(postId);
      if (updatedPost) {
        setPosts(prevPosts => 
          prevPosts.map(post => post.id === postId ? updatedPost : post)
        );
      }
    } catch (err) {
      console.error("Error refreshing user like:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh user like");
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
        posts={posts}
        onLikeTotem={handleLikeTotem}
        onUnlikeTotem={handleUnlikeTotem}
        onRefreshTotem={handleRefreshTotem}
        onRefreshUserLike={handleRefreshUserLike}
        isLiked={isLiked}
        originalLikeTimestamp={originalLikeTimestamp}
      />
    </>
  );
} 