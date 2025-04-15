"use client";

import React from 'react';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { useAuth } from '@/contexts/AuthContext';
import type { Post } from '@/types/modelsV2';
import { TotemButton } from '@/components/totem/TotemButtonV2';

interface TotemDetailV2Props {
  post: Post;
  totemName: string;
}

export function TotemDetailV2({ post, totemName }: TotemDetailV2Props) {
  const { user } = useAuth();
  const { isLiked } = useTotemV2();

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