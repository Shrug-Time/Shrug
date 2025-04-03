"use client";

import { useState, useEffect, useCallback } from 'react';
import { TotemDetail } from '@/components/totem/TotemDetail';
import type { Post } from '@/types/models';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { db } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { PostService } from '@/services/firebase';
import Link from 'next/link';

interface PostTotemClientProps {
  postId: string;
  totemName: string;
}

export function PostTotemClient({ postId, totemName }: PostTotemClientProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toggleLike } = useTotemV2();

  // Initial data fetch
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const fetchedPost = await PostService.getPost(postId);
        if (!fetchedPost) {
          throw new Error('Post not found');
        }
        setPost(fetchedPost);
      } catch (error) {
        console.error('Error fetching post:', error);
        setError(error instanceof Error ? error.message : 'Failed to load post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  // Set up real-time listener
  useEffect(() => {
    if (!post) return;

    const postRef = doc(db, 'posts', postId);
    const unsubscribe = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        const updatedPost = doc.data() as Post;
        setPost(updatedPost);
      }
    });

    return () => unsubscribe();
  }, [postId, post]);

  const handleLikeTotem = useCallback(async () => {
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
  }, [user, postId, totemName, toggleLike]);

  const handleUnlikeTotem = useCallback(async () => {
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
  }, [user, postId, totemName, toggleLike]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        <p>{error}</p>
        <Link
          href="/"
          className="text-blue-500 hover:underline mt-4 inline-block"
        >
          ← Back to Home
        </Link>
      </div>
    );
  }

  if (!post) {
    return <div>Post not found</div>;
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