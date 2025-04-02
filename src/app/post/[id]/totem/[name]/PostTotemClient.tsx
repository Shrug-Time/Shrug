"use client";

import { useState, useEffect, useCallback } from 'react';
import { TotemDetail } from '@/components/totem/TotemDetail';
import type { Post } from '@/types/models';
import { getPost } from '@/lib/firebase/posts';
import { useTotem } from '@/contexts/TotemContext';

interface PostTotemClientProps {
  initialPost: Post;
  totemName: string;
}

export function PostTotemClient({ initialPost, totemName }: PostTotemClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, toggleLike, getPost: getPostFromState, updatePost } = useTotem();

  // Get post from global state or use initial post
  const post = getPostFromState(initialPost.id) || initialPost;

  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const updatedPost = await getPost(initialPost.id);
        if (updatedPost) {
          updatePost(updatedPost);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [initialPost.id, updatePost]);

  const handleLikeTotem = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to like a totem');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await toggleLike(post.id, totemName);
    } catch (error) {
      console.error('Error liking totem:', error);
      setError(error instanceof Error ? error.message : 'Failed to like totem');
    } finally {
      setIsLoading(false);
    }
  }, [user, post.id, totemName, toggleLike]);

  const handleUnlikeTotem = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to unlike a totem');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await toggleLike(post.id, totemName);
    } catch (error) {
      console.error('Error unliking totem:', error);
      setError(error instanceof Error ? error.message : 'Failed to unlike totem');
    } finally {
      setIsLoading(false);
    }
  }, [user, post.id, totemName, toggleLike]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <TotemDetail
      post={post}
      totemName={totemName}
      onLike={handleLikeTotem}
      onUnlike={handleUnlikeTotem}
    />
  );
} 