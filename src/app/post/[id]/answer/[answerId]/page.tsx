"use client";

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PostService } from '@/services/firebase';
import { formatDistanceToNow } from 'date-fns';
import { TotemButton } from '@/components/totem/TotemButtonV2';
import { getUserDisplayName } from '@/utils/componentHelpers';
import Link from 'next/link';
import { useState } from 'react';
import { AnswerModal } from '@/components/answers/AnswerModal';
import type { Post } from '@/types/models';

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

export default function AnswerDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const answerId = params.answerId as string;
  const queryClient = useQueryClient();
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => PostService.getPost(postId),
  });

  const handleAnswerSubmitted = () => {
    setSelectedQuestion(null);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  const answer = post.answers.find(a => a.id === answerId);
  if (!answer) {
    return <div>Answer not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/post/${postId}`} className="text-blue-500 hover:underline">
            ← Back to question
          </Link>
          <button
            onClick={() => setSelectedQuestion(post)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            +
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.question}</h1>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="text-gray-600 mb-6 text-lg">
          {answer.text}
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Totems for this answer:</h2>
          <div className="flex flex-wrap gap-2">
            {answer.totems.map(totem => (
              <TotemButton
                key={totem.name}
                totemName={totem.name}
                postId={post.id}
              />
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {formatDistanceToNow(toDate(answer.createdAt), { addSuffix: true })} by {getUserDisplayName(answer)}
        </div>
      </div>

      {selectedQuestion && (
        <AnswerModal
          isOpen={!!selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          selectedQuestion={selectedQuestion}
          onAnswerSubmitted={handleAnswerSubmitted}
        />
      )}
    </div>
  );
} 