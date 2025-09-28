"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PostService } from '@/services/firebase';
import { QuestionAnswers } from '@/components/questions/QuestionAnswers';
import type { Post } from '@/types/models';

export default function QuestionTotemsPage() {
  const params = useParams();
  const postId = params.id as string;

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.question}</h1>
        <div className="text-sm text-gray-600">
          Asked by {post.username}
        </div>
      </div>

      <QuestionAnswers post={post} />
    </div>
  );
} 