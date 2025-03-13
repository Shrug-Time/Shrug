"use client";

import { Post } from '@/types/models';
import { TotemButton } from '@/components/common/TotemButton';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { InfiniteScroll } from '@/components/common/InfiniteScroll';

interface TotemDetailProps {
  totemName: string;
  posts: Post[];
  onLikeTotem: (postId: string, totemName: string) => Promise<void>;
  onRefreshTotem: (postId: string, totemName: string) => Promise<void>;
  hasNextPage?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
}

export function TotemDetail({
  totemName,
  posts,
  onLikeTotem,
  onRefreshTotem,
  hasNextPage = false,
  isLoading = false,
  onLoadMore = () => {},
}: TotemDetailProps) {
  // Filter and sort answers that have this totem
  const sortedAnswers = posts.flatMap(post => 
    post.answers
      .map((answer, index) => {
        const matchingTotem = answer.totems?.find(t => t.name === totemName);
        if (!matchingTotem) return null;
        return {
          post,
          answer,
          answerIndex: index,
          totem: matchingTotem,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  ).sort((a, b) => b.totem.likes - a.totem.likes);

  if (!sortedAnswers.length && !isLoading) {
    return (
      <p className="text-gray-600 text-center py-8">
        No answers found for totem: {totemName}
      </p>
    );
  }

  return (
    <InfiniteScroll
      hasNextPage={hasNextPage}
      isLoading={isLoading}
      onLoadMore={onLoadMore}
      className="space-y-6"
    >
      {sortedAnswers.map(({ post, answer, totem }) => (
        <article 
          key={`${post.id}-${answer.text}`}
          className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow"
        >
          <Link
            href={`/post/${post.id}`}
            className="block mb-4"
          >
            <h2 className="text-xl font-bold mb-2">
              {post.question}
            </h2>
            <div className="text-gray-600">
              {answer.text}
            </div>
          </Link>

          <div className="flex items-center justify-between">
            <TotemButton
              name={totem.name}
              likes={totem.likes}
              crispness={totem.crispness}
              onLike={() => onLikeTotem(post.id, totemName)}
              onRefresh={() => onRefreshTotem(post.id, totemName)}
            />
            
            <div className="text-sm text-gray-500">
              {formatDistanceToNow(answer.createdAt, { addSuffix: true })} by {answer.userName || 'Anonymous'}
            </div>
          </div>
        </article>
      ))}
    </InfiniteScroll>
  );
} 