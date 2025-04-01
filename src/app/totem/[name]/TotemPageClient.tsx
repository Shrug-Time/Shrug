'use client';

import { TotemDetail } from '@/components/totem/TotemDetail';
import { Post, Totem } from '@/types/models';
import { useState, useEffect } from 'react';
import { getPost } from '@/lib/firebase/posts';
import { useTotem } from '@/contexts/TotemContext';

interface TotemPageClientProps {
  initialPosts: Post[];
  totemName: string;
}

export function TotemPageClient({ initialPosts, totemName }: TotemPageClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, toggleLike, getPost: getPostFromState, updatePost } = useTotem();

  // Get posts from global state or use initial posts
  const posts = initialPosts.map(post => getPostFromState(post.id) || post);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const updatedPosts = await Promise.all(
          initialPosts.map(post => getPost(post.id))
        );
        updatedPosts.forEach(post => {
          if (post) {
            updatePost(post);
          }
        });
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [initialPosts, updatePost]);

  const handleLikeTotem = async (postId: string) => {
    if (!user) {
      setError('You must be logged in to like a totem');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await toggleLike(postId, totemName);
    } catch (error) {
      console.error('Error liking totem:', error);
      setError(error instanceof Error ? error.message : 'Failed to like totem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlikeTotem = async (postId: string) => {
    if (!user) {
      setError('You must be logged in to unlike a totem');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await toggleLike(postId, totemName);
    } catch (error) {
      console.error('Error unliking totem:', error);
      setError(error instanceof Error ? error.message : 'Failed to unlike totem');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {posts.map(post => (
        <TotemDetail
          key={post.id}
          post={post}
          totemName={totemName}
          onLike={() => handleLikeTotem(post.id)}
          onUnlike={() => handleUnlikeTotem(post.id)}
        />
      ))}
    </div>
  );
} 