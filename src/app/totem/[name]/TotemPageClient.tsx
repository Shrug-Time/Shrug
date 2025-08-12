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
        <div className="flex items-center space-x-4 text-gray-600">
          <span>{Object.values(postsByQuestion).flat().length} answers</span>
          <span>•</span>
          <span>{Object.values(postsByQuestion).flat().reduce((sum, { totalLikes }) => sum + totalLikes, 0)} total likes</span>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(postsByQuestion).map(([question, questionPosts]) => (
          <div key={question} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">{question}</h2>
            
            {/* Flatten and sort all answers across posts for this question */}
            {(() => {
              const allAnswers = questionPosts.flatMap(({ post }) => 
                post.answers
                  .filter(answer => answer.totems.some(t => t.name === totemName))
                  .map(answer => ({
                    answer,
                    post,
                    totem: answer.totems.find(t => t.name === totemName)!,
                    likes: answer.totems.find(t => t.name === totemName)?.likeHistory?.filter(like => like.isActive).length || 0,
                    crispness: answer.totems.find(t => t.name === totemName)?.crispness || 0
                  }))
              ).sort((a, b) => {
                // Sort by likes first, then crispness
                if (b.likes !== a.likes) {
                  return b.likes - a.likes;
                }
                return b.crispness - a.crispness;
              });

              return (
                <div className="space-y-6">
                  {allAnswers.map((answerData, index) => (
                    <div key={`${answerData.post.id}-${answerData.answer.id}`} className="relative flex items-center gap-4">
                      {/* Number Circle */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        {index < allAnswers.length - 1 && (
                          <div className="w-0.5 h-6 bg-blue-200 mt-1"></div>
                        )}
                      </div>

                      {/* Answer Content */}
                      <div className="flex-1 bg-white rounded-xl shadow p-4">
                        <div className="text-gray-600 mb-4">
                          {answerData.answer.text}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <TotemButton
                              totemName={totemName}
                              postId={answerData.post.id}
                              answerId={answerData.answer.id}
                            />
                            {answerData.answer.totems.length > 1 && (
                              <span className="text-sm text-gray-500">
                                +{answerData.answer.totems.length - 1} more totems
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDistanceToNow(getDate(answerData.post.createdAt), { addSuffix: true })} by{' '}
                            <Link 
                              href={getProfileUrl(answerData.answer.username || answerData.answer.firebaseUid || '')}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {getUserDisplayName(answerData.answer)}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
} 