'use client';

import { TotemDetail } from '@/components/totem/TotemDetail';
import { Post } from '@/types/models';
import { useState } from 'react';
import { updateTotemLikes, refreshTotem, getPost } from '@/lib/firebase/posts';

interface TotemPageClientProps {
  initialPosts: Post[];
  totemName: string;
}

export function TotemPageClient({ initialPosts, totemName }: TotemPageClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [error, setError] = useState<string | null>(null);

  const handleLikeTotem = async (postId: string, totemName: string) => {
    setError(null);
    try {
      await updateTotemLikes(postId, totemName);
      
      // Fetch the updated post to get the correct crispness and like count
      const updatedPost = await getPost(postId);
      if (updatedPost) {
        // Update the posts array with the updated post
        setPosts(prevPosts => 
          prevPosts.map(post => post.id === postId ? updatedPost : post)
        );
      }
    } catch (err) {
      console.error("Error liking totem:", err);
      setError(err instanceof Error ? err.message : "Failed to like totem");
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
        onRefreshTotem={handleRefreshTotem}
      />
    </>
  );
} 