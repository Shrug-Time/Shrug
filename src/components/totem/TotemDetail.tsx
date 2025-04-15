"use client";

import React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import Link from 'next/link';
import type { Post } from '@/types/models';
import { TotemButton } from '@/components/totem/TotemButton';

interface TotemDetailProps {
  post: Post;
  totemName: string;
}

export function TotemDetail({ post, totemName }: TotemDetailProps) {
  const { isLiked } = useTotem();

  // Find the totem in the post's answers
  const totem = post.answers
    .flatMap(answer => answer.totems)
    .find(t => t.name === totemName);

  if (!totem) {
    return null;
  }

  const liked = isLiked(post.id, totemName);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {totemName}
        </h2>
        <TotemButton
          totemName={totemName}
          postId={post.id}
        />
      </div>
      
      <div className="text-gray-600">
        {post.question}
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        {post.answers.length} answers
      </div>
    </div>
  );
} 