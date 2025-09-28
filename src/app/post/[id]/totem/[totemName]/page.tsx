"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PostService } from '@/services/firebase';
import { formatDistanceToNow } from 'date-fns';
import { getTotemLikes, getUserDisplayName } from '@/utils/componentHelpers';
import Link from 'next/link';
import { TotemButton } from '@/components/totem/TotemButton';
import type { Post, Answer, Totem } from '@/types/models';
import { FormattedText } from '@/utils/textFormatting';

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

export default function QuestionTotemPage() {
  const params = useParams();
  const postId = params.id as string;
  const totemName = params.totemName as string;

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => PostService.getPost(postId),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  // Get all answers that have this totem and sort them by likes
  const totemAnswers = post.answers
    .filter(answer => answer.totems.some(t => t.name === totemName))
    .map(answer => {
      const totem = answer.totems.find(t => t.name === totemName)!;
      return {
        answer,
        totem,
        likes: getTotemLikes(totem),
        crispness: totem.crispness || 0
      };
    })
    .sort((a, b) => {
      // Primary sort: highest likes first
      if (b.likes !== a.likes) {
        return b.likes - a.likes;
      }
      // Tiebreaker: highest crispness first
      return b.crispness - a.crispness;
    });

  const totalLikes = totemAnswers.reduce((sum, { likes }) => sum + likes, 0);

  return (
    <div className="max-w-4xl lg:ml-64 mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.question}</h1>
        <div className="text-sm text-gray-600">
          Asked by {post.username}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {totemName}
        </h2>
        <p className="text-gray-600">
          {totemAnswers.length} answers • {totalLikes} total likes
        </p>
      </div>

      <div className="space-y-6">
        {totemAnswers.map(({ answer, totem }, index) => (
          <div key={`${answer.firebaseUid}-${index}`} className="relative flex items-center gap-4">
            {/* Number Circle */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>
              {index < totemAnswers.length - 1 && (
                <div className="w-0.5 h-6 bg-blue-200 mt-1"></div>
              )}
            </div>

            {/* Answer Content */}
            <div className="flex-1 bg-white rounded-xl shadow p-4">
              <div className="text-gray-600 mb-4">
                <FormattedText text={answer.text} />
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
                  {formatDistanceToNow(toDate(answer.createdAt), { addSuffix: true })} by {getUserDisplayName(answer)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 