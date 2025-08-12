"use client";

import React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Post } from '@/types/models';
import { TotemButton } from '@/components/totem/TotemButton';
import { getTotemLikes, getUserDisplayName } from '@/utils/componentHelpers';
import { formatDistanceToNow } from 'date-fns';
import { getProfileUrl } from '@/utils/routes';
import Link from 'next/link';

// Helper function to safely convert various date formats to a Date object
const getDate = (timestamp: any): Date => {
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'number') return new Date(timestamp);
  if (typeof timestamp === 'string') return new Date(timestamp);
  return new Date();
};

interface TotemPageClientProps {
  posts: Post[];
  totemName: string;
}

export function TotemPageClient({ posts, totemName }: TotemPageClientProps) {
  const { user } = useAuth();
  const { isLiked } = useTotem();

  // Filter posts to only show those with this totem
  const relevantPosts = posts.filter(post => 
    post.answers.some(answer => 
      answer.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
    )
  );

  // Group posts by question and sort by likes
  const postsByQuestion = relevantPosts.reduce((acc, post) => {
    const key = post.question;
    if (!acc[key]) {
      acc[key] = [];
    }
    
    // Calculate total active likes for this totem in this post
    const totalLikes = post.answers.reduce((sum, answer) => {
      const totem = answer.totems.find(t => t.name.toLowerCase() === totemName.toLowerCase());
      if (totem) {
        // Count only active likes
        const activeLikes = totem.likeHistory?.filter(like => like.isActive).length || 0;
        return sum + activeLikes;
      }
      return sum;
    }, 0);
    
    acc[key].push({ post, totalLikes });
    return acc;
  }, {} as Record<string, Array<{ post: Post; totalLikes: number }>>);

  // Sort posts within each question by total likes (highest first), then by crispness as tiebreaker
  Object.keys(postsByQuestion).forEach(question => {
    postsByQuestion[question].sort((a, b) => {
      // Primary sort: highest likes first
      if (b.totalLikes !== a.totalLikes) {
        return b.totalLikes - a.totalLikes;
      }
      
      // Tiebreaker: highest crispness first
      const aCrispness = Math.max(...a.post.answers
        .filter(answer => answer.totems?.some(t => t.name.toLowerCase() === totemName.toLowerCase()))
        .map(answer => {
          const totem = answer.totems?.find(t => t.name.toLowerCase() === totemName.toLowerCase());
          return totem?.crispness || 0;
        }));
      
      const bCrispness = Math.max(...b.post.answers
        .filter(answer => answer.totems?.some(t => t.name.toLowerCase() === totemName.toLowerCase()))
        .map(answer => {
          const totem = answer.totems?.find(t => t.name.toLowerCase() === totemName.toLowerCase());
          return totem?.crispness || 0;
        }));
      
      return bCrispness - aCrispness;
    });
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {totemName}
        </h1>
        <p className="text-gray-600">
          {relevantPosts.length} posts using this totem
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(postsByQuestion).map(([question, questionPosts]) => (
          <div key={question} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">{question}</h2>
            <div className="space-y-4">
              {questionPosts.map(({ post }) => (
                <div key={post.id} className="bg-white rounded-xl shadow p-4">
                  {/* Show all answers that use this totem */}
                  {post.answers
                    .filter(answer => answer.totems.some(t => t.name === totemName))
                    .map((answer, index) => {
                      const totem = answer.totems.find(t => t.name === totemName);
                      if (!totem) return null;
                      
                      return (
                        <div key={`${post.id}-${index}`} className="mb-4 last:mb-0">
                          <div className="text-gray-600 mb-4">
                            {answer.text}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <TotemButton
                                totemName={totemName}
                                postId={post.id}
                                answerId={answer.id}
                              />
                              {answer.totems.length > 1 && (
                                <span className="text-sm text-gray-500">
                                  +{answer.totems.length - 1} more totems
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDistanceToNow(getDate(post.createdAt), { addSuffix: true })} by{' '}
                              <Link 
                                href={getProfileUrl(answer.username || answer.firebaseUid || '')}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {getUserDisplayName(answer)}
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 