"use client";

import { Post, TotemLike, Totem } from '@/types/models';
import { auth } from '@/firebase';
import { TotemButton } from '@/components/common/TotemButton';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { InfiniteScroll } from '@/components/common/InfiniteScroll';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { TOTEM_FIELDS } from '@/constants/fields';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/TotemContext';

interface TotemDetailProps {
  totemName: string;
  posts: Post[];
  onLikeTotem: (postId: string, totemName: string) => Promise<void>;
  onUnlikeTotem: (postId: string, totemName: string) => Promise<void>;
  hasNextPage?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
  currentUserId: string | null;
}

export function TotemDetail({
  totemName,
  posts,
  onLikeTotem,
  onUnlikeTotem,
  hasNextPage = false,
  isLoading = false,
  onLoadMore = () => {},
  currentUserId,
}: TotemDetailProps) {
  try {
    console.log('TotemDetail - START');
    
    if (!posts) {
      console.error('TotemDetail - posts is undefined');
      return <div>Error: No posts data</div>;
    }

    if (!totemName) {
      console.error('TotemDetail - totemName is undefined');
      return <div>Error: No totem name</div>;
    }

    console.log('TotemDetail - Component rendered:', { 
      totemName, 
      postsCount: posts.length,
      currentUserId,
      posts: posts.map(p => ({
        id: p.id,
        question: p.question,
        answersCount: p.answers?.length || 0,
        answers: p.answers?.map(a => ({
          totems: a.totems?.map(t => ({
            name: t.name,
            likes: t.likes,
            hasLikeHistory: !!t.likeHistory
          }))
        }))
      }))
    });

    const router = useRouter();

    // Filter and sort answers that have this totem
    const sortedAnswers = posts
      .flatMap(post => {
        console.log('TotemDetail - Processing post:', { 
          postId: post.id, 
          question: post.question,
          answersCount: post.answers.length,
          answers: post.answers.map(a => ({
            totems: a.totems.map(t => t.name)
          }))
        });

        // Get all answers that have this totem
        const answersWithTotem = post.answers
          .map((answer, index) => {
            const totem = answer.totems.find(t => t.name === totemName);
            if (!totem) return null;
            return { post, answer, totem, index };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);
        
        return answersWithTotem;
      })
      .sort((a, b) => b.totem.likes - a.totem.likes);

    if (!sortedAnswers.length && !isLoading) {
      return (
        <p className="text-gray-600 text-center py-8">
          No answers found for totem: {totemName}
        </p>
      );
    }

    // Helper function to check if a user has liked a totem
    const hasUserLiked = (totem: Totem, userId: string): boolean => {
      return totem.likeHistory?.some((like: TotemLike) => like.userId === userId && like.isActive) || false;
    };

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{totemName}</h1>
          <Link 
            href="/post-totem" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            + Add Answer
          </Link>
        </div>

        <InfiniteScroll
          hasNextPage={hasNextPage}
          isLoading={isLoading}
          onLoadMore={onLoadMore}
        >
          <div className="space-y-6">
            {sortedAnswers.map(({ post, answer, totem, index }) => {
              const key = `${post.id}-${answer.text}-${totem.name}`;
              const isLiked = currentUserId ? hasUserLiked(totem, currentUserId) : false;
              
              return (
                <div key={key} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{post.question}</h2>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-gray-600 mb-4">
                    {answer.text}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TotemButton
                        key={key}
                        name={totem.name}
                        likes={totem.likes}
                        isLiked={isLiked}
                        postId={post.id}
                        onLike={() => onLikeTotem(post.id, totem.name)}
                        onUnlike={() => onUnlikeTotem(post.id, totem.name)}
                      />
                      {answer.totems.length > 1 && (
                        <span className="text-sm text-gray-500">
                          +{answer.totems.length - 1} more totems
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      by {answer.username || answer.userName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </InfiniteScroll>
      </div>
    );
  } catch (error) {
    console.error('TotemDetail - Error:', error);
    return <div>Error loading totem details</div>;
  }
} 