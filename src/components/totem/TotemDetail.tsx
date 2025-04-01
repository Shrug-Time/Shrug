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
import { useTotem } from '@/contexts/TotemContext';
import { hasUserLikedTotem, getTotemLikes, getTotemCrispness, getUserDisplayName } from '@/utils/componentHelpers';
import dateHelpers from '@/utils/dateHelpers';

const { toDate } = dateHelpers;

interface TotemDetailProps {
  post: Post;
  totemName: string;
  onLike: () => Promise<void>;
  onUnlike: () => Promise<void>;
}

export function TotemDetail({ post, totemName, onLike, onUnlike }: TotemDetailProps) {
  const { user } = useTotem();

  // Find the answer containing the totem
  const answer = post.answers.find(answer => 
    answer.totems?.some(totem => totem.name === totemName)
  );

  if (!answer) {
    return <div>Totem not found in this post</div>;
  }

  const totem = answer.totems.find(t => t.name === totemName);
  if (!totem) {
    return <div>Totem not found in this post</div>;
  }

  const isLiked = user ? hasUserLikedTotem(totem, user.uid) : false;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">{post.question}</h1>
        <div className="text-gray-600 mb-4">
          {answer.text}
        </div>
        <div className="flex items-center justify-between">
          <TotemButton
            name={totem.name}
            likes={getTotemLikes(totem)}
            crispness={getTotemCrispness(totem)}
            isLiked={isLiked}
            onLike={onLike}
            onUnlike={onUnlike}
            postId={post.id}
          />
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(toDate(answer.createdAt), { addSuffix: true })} by {getUserDisplayName(answer)}
          </div>
        </div>
      </div>
    </div>
  );
} 