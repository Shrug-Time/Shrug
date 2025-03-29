'use client';

import { TotemDetail } from '@/components/totem/TotemDetail';
import { Post } from '@/types/models';
import { useState, useEffect } from 'react';
import { updateTotemLikes, refreshTotem, getPost, unlikeTotem } from '@/lib/firebase/posts';
import { auth } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface TotemPageClientProps {
  initialPosts: Post[];
  totemName: string;
}

export function TotemPageClient({ initialPosts, totemName }: TotemPageClientProps) {
  try {
    console.log('TotemPageClient - START');
    
    if (!initialPosts) {
      console.error('TotemPageClient - initialPosts is undefined');
      return <div>Error: No posts data</div>;
    }

    console.log('TotemPageClient - Initializing with:', {
      totemName,
      postsCount: initialPosts.length,
      posts: initialPosts.map(p => ({
        id: p.id,
        question: p.question,
        answersCount: p.answers?.length || 0,
        answers: p.answers?.map(a => ({
          totems: a.totems?.map(t => ({
            name: t.name,
            likes: t.likes,
            hasLikeHistory: !!t.likeHistory,
            hasLikedBy: !!t.likedBy
          }))
        }))
      }))
    });

    const [posts, setPosts] = useState(initialPosts);
    const [error, setError] = useState<string | null>(null);
    const [isLiking, setIsLiking] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Add auth state management
    useEffect(() => {
      console.log('TotemPageClient - Setting up auth listener');
      const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
        console.log('TotemPageClient - Auth state changed:', { 
          userId: user?.uid,
          hasUser: !!user 
        });
        setCurrentUserId(user?.uid || null);
      });

      return () => {
        console.log('TotemPageClient - Cleaning up auth listener');
        unsubscribe();
      };
    }, []);

    const handleLikeTotem = async (postId: string, totemName: string) => {
      if (isLiking) return;
      setIsLiking(true);
      setError(null);
      
      try {
        if (!currentUserId) {
          setError("You must be logged in to like a totem");
          return;
        }

        const result = await updateTotemLikes(postId, totemName);
        
        if (result && result.post) {
          setPosts(prevPosts => 
            prevPosts.map(post => post.id === postId ? result.post! : post)
          );
        }
      } catch (err) {
        console.error("Error liking totem:", err);
        setError(err instanceof Error ? err.message : "Failed to like totem");
      } finally {
        setIsLiking(false);
      }
    };

    const handleUnlikeTotem = async (postId: string, totemName: string) => {
      if (isLiking) return;
      setIsLiking(true);
      setError(null);
      
      try {
        if (!currentUserId) {
          setError("You must be logged in to unlike a totem");
          return;
        }

        const result = await unlikeTotem(postId, totemName);
        
        if (result && result.post) {
          setPosts(prevPosts => 
            prevPosts.map(post => post.id === postId ? result.post! : post)
          );
        }
      } catch (err) {
        console.error("Error unliking totem:", err);
        setError(err instanceof Error ? err.message : "Failed to unlike totem");
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
          // Update the posts array with the updated post
          setPosts(prevPosts => 
            prevPosts.map(post => post.id === postId ? updatedPost : post)
          );
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
          posts={posts}
          onLikeTotem={handleLikeTotem}
          onUnlikeTotem={handleUnlikeTotem}
          currentUserId={currentUserId}
        />
      </>
    );
  } catch (error) {
    console.error('TotemPageClient - Error during initialization:', error);
    return <div>Error initializing totem page</div>;
  }
} 