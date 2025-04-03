'use client';

import { useState, useEffect } from 'react';
import { TotemDetail } from '@/components/totem/TotemDetail';
import type { Post } from '@/types/models';
import { getPost } from '@/lib/firebase/posts';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface TotemPageClientProps {
  initialPost: Post;
  totemName: string;
}

export function TotemPageClient({ initialPost, totemName }: TotemPageClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toggleLike } = useTotemV2();

  useEffect(() => {
    // Initial fetch
    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const updatedPost = await getPost(initialPost.id);
        if (updatedPost) {
          // Update local state if needed
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();

    // Set up real-time listener
    const postRef = doc(db, 'posts', initialPost.id);
    const unsubscribe = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        const updatedPost = doc.data() as Post;
        // Update local state if needed
      }
    });

    return () => unsubscribe();
  }, [initialPost.id]);

  const handleLikeTotem = async () => {
    if (!user) {
      setError('You must be logged in to like a totem');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await toggleLike(initialPost.id, totemName);
    } catch (error) {
      console.error('Error liking totem:', error);
      setError(error instanceof Error ? error.message : 'Failed to like totem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlikeTotem = async () => {
    if (!user) {
      setError('You must be logged in to unlike a totem');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await toggleLike(initialPost.id, totemName);
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
    <TotemDetail
      post={initialPost}
      totemName={totemName}
      onLike={handleLikeTotem}
      onUnlike={handleUnlikeTotem}
    />
  );
} 