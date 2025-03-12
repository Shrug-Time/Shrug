import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Post, TotemSuggestion, Answer, Totem } from '@/types/models';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TotemButton } from '@/components/common/TotemButton';
import { auth } from '@/firebase';
import Link from 'next/link';
import { SimilarityService } from '@/services/similarity';
import { InfiniteScroll } from '@/components/common/InfiniteScroll';

export interface QuestionListProps {
  posts: Post[];
  onSelectQuestion: (post: Post) => void;
  onLikeTotem: (post: Post, answerIdx: number, totemName: string) => Promise<void>;
  onRefreshTotem: (post: Post, answerIdx: number, totemName: string) => Promise<void>;
  showAllTotems?: boolean;
  hasNextPage?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
}

interface TotemGroup {
  totemName: string;
  topAnswer: {
    post: Post;
    answerIndex: number;
    likes: number;
  };
  totalAnswers: number;
}

export function QuestionList({ 
  posts, 
  onSelectQuestion, 
  onLikeTotem,
  onRefreshTotem,
  showAllTotems = false,
  hasNextPage = false,
  isLoading = false,
  onLoadMore = () => {},
}: QuestionListProps) {
  const router = useRouter();

  const emptyPost: Post = {
    id: '',
    question: '',
    answers: [],
    createdAt: new Date().toISOString(),
    lastEngagement: new Date().toISOString(),
    score: 0,
    categories: []
  };

  // Group answers by totem and find top answer for each totem
  const totemGroups = useMemo(() => {
    const groups = new Map<string, TotemGroup>();

    posts.forEach(post => {
      post.answers.forEach((answer, answerIndex) => {
        answer.totems?.forEach(totem => {
          const existing = groups.get(totem.name);
          if (!existing || totem.likes > existing.topAnswer.likes) {
            groups.set(totem.name, {
              totemName: totem.name,
              topAnswer: {
                post,
                answerIndex,
                likes: totem.likes
              },
              totalAnswers: existing ? existing.totalAnswers + 1 : 1
            });
          } else if (existing) {
            groups.set(totem.name, {
              ...existing,
              totalAnswers: existing.totalAnswers + 1
            });
          }
        });
      });
    });

    // Convert to array and sort by likes
    return Array.from(groups.values()).sort((a, b) => 
      b.topAnswer.likes - a.topAnswer.likes
    );
  }, [posts]);

  const renderTopAnswer = useCallback((group: TotemGroup) => {
    const { post, answerIndex } = group.topAnswer;
    const answer = post.answers[answerIndex];
    const totem = answer.totems?.find(t => t.name === group.totemName);
    if (!answer || !totem) return null;

    return (
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <Link
            href={`/post/${post.id}`}
            className="flex-1"
          >
            <h2 className="text-xl font-bold mb-2">
              {post.question}
            </h2>
            <div className="text-gray-600">
              {answer.text.split('\n')[0]}
            </div>
          </Link>
          <button
            onClick={() => {
              const validPost = {
                ...post,
                question: post.question || '',
                answers: post.answers || [],
                createdAt: post.createdAt || new Date().toISOString(),
                lastEngagement: post.lastEngagement || new Date().toISOString(),
                score: post.score || 0,
                categories: post.categories || []
              };
              onSelectQuestion(validPost);
            }}
            className="ml-4 w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md transition-colors"
            aria-label="Add answer"
          >
            +
          </button>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/totem/${group.totemName}`}
            className="flex items-center space-x-2"
          >
            <TotemButton
              name={totem.name}
              likes={totem.likes}
              crispness={totem.crispness}
              onLike={() => onLikeTotem(post, answerIndex, totem.name)}
              onRefresh={() => onRefreshTotem(post, answerIndex, totem.name)}
            />
            <span className="text-sm text-gray-500">
              {group.totalAnswers} answers
            </span>
          </Link>
          
          <div className="text-sm text-gray-500">
            {answer.createdAt ? 
              formatDistanceToNow(
                typeof answer.createdAt === 'number' 
                  ? new Date(answer.createdAt) 
                  : (answer.createdAt as Timestamp).toDate(), 
                { addSuffix: true }
              ) : "Just now"} by {answer.userName || 'Anonymous'}
          </div>
        </div>
      </div>
    );
  }, [onLikeTotem, onRefreshTotem, onSelectQuestion]);

  if (!posts.length && !isLoading) {
    return (
      <div className="relative">
        <p className="text-gray-600 text-center py-8" role="status">
          No posts available
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <InfiniteScroll
        hasNextPage={hasNextPage}
        isLoading={isLoading}
        onLoadMore={onLoadMore}
        className="space-y-6"
      >
        {totemGroups.map(group => (
          <article 
            key={group.totemName}
            className="relative"
          >
            {renderTopAnswer(group)}
          </article>
        ))}
      </InfiniteScroll>
    </div>
  );
} 