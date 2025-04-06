"use client";

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PostService } from '@/services/firebase';
import { formatDistanceToNow } from 'date-fns';
import { TotemButton } from '@/components/totem/TotemButtonV2';
import { getTotemLikes, getUserDisplayName } from '@/utils/componentHelpers';
import Link from 'next/link';

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

export default function AnswerPage() {
  const params = useParams();
  const postId = params.id as string;
  const answerId = params.answerId as string;

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

  const answer = post.answers.find(a => a.id === answerId);
  if (!answer) {
    return <div>Answer not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <Link href={`/post/${postId}`} className="text-blue-500 hover:underline mb-4 block">
          ← Back to question
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.question}</h1>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="text-gray-600 mb-4">
          {answer.text}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {answer.totems.map(totem => (
              <TotemButton
                key={totem.name}
                totemName={totem.name}
                postId={post.id}
              />
            ))}
          </div>
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(toDate(answer.createdAt), { addSuffix: true })} by {getUserDisplayName(answer)}
          </div>
        </div>
      </div>
    </div>
  );
} 