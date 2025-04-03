"use client";

import React from 'react';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { useAuth } from '@/contexts/AuthContext';
import type { Post } from '@/types/modelsV2';
import { TotemDetailV2 } from '@/components/totem/TotemDetailV2';
import { getTotemLikes, getUserDisplayName } from '@/utils/componentHelpers';
import { formatDistanceToNow } from 'date-fns';
import { TotemButton } from '@/components/totem/TotemButtonV2';

// Helper function to safely convert various date formats to a Date object
const toDate = (dateField: any): Date => {
  if (!dateField) return new Date();
  
  if (dateField instanceof Date) return dateField;
  
  if (typeof dateField === 'object' && 'toDate' in dateField && typeof dateField.toDate === 'function') {
    return dateField.toDate();
  }
  
  if (typeof dateField === 'string') return new Date(dateField);
  
  if (typeof dateField === 'number') return new Date(dateField);
  
  return new Date();
};

interface TotemPageClientV2Props {
  posts: Post[];
  totemName: string;
}

export function TotemPageClientV2({ posts, totemName }: TotemPageClientV2Props) {
  const { user } = useAuth();
  const { isLiked } = useTotemV2();

  // Filter posts to only show those with this totem
  const relevantPosts = posts.filter(post => 
    post.answers.some(answer => 
      answer.totems.some(t => t.name === totemName)
    )
  );

  // Group posts by question and sort by likes
  const postsByQuestion = relevantPosts.reduce((acc, post) => {
    const key = post.question;
    if (!acc[key]) {
      acc[key] = [];
    }
    
    // Calculate total likes for this totem in this post
    const totalLikes = post.answers.reduce((sum, answer) => {
      const totem = answer.totems.find(t => t.name === totemName);
      return sum + (totem ? getTotemLikes(totem) : 0);
    }, 0);
    
    acc[key].push({ post, totalLikes });
    return acc;
  }, {} as Record<string, Array<{ post: Post; totalLikes: number }>>);

  // Sort posts within each question by total likes
  Object.keys(postsByQuestion).forEach(question => {
    postsByQuestion[question].sort((a, b) => b.totalLikes - a.totalLikes);
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
                              />
                              {answer.totems.length > 1 && (
                                <span className="text-sm text-gray-500">
                                  +{answer.totems.length - 1} more totems
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDistanceToNow(toDate(post.createdAt), { addSuffix: true })} by {getUserDisplayName(answer)}
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