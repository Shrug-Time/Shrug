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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleInteraction = useCallback((action: () => void) => {
    if (!auth.currentUser) {
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3000);
      return;
    }
    action();
  }, []);

  const renderQuestion = useCallback((post: Post) => {
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
            {post.answers.length > 0 && (
              <div className="text-gray-600">
                {post.answers[0].text.split('\n')[0]}
              </div>
            )}
          </Link>
          <button
            onClick={() => handleInteraction(() => onSelectQuestion(post))}
            className="ml-4 w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md transition-colors"
            aria-label="Add answer"
          >
            +
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {post.answers.length > 0 ? (
              <>
                {post.answers[0].totems.map((totem) => (
                  <TotemButton
                    key={totem.name}
                    name={totem.name}
                    likes={totem.likes}
                    crispness={totem.crispness}
                    onLike={() => handleInteraction(() => onLikeTotem(post, 0, totem.name))}
                    onRefresh={() => handleInteraction(() => onRefreshTotem(post, 0, totem.name))}
                  />
                ))}
                <span className="text-sm text-gray-500">
                  {post.answers.length} answers
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-500">
                No answers yet
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(post.createdAt, { addSuffix: true })} by {post.userName || 'Anonymous'}
          </div>
        </div>
      </div>
    );
  }, [onLikeTotem, onRefreshTotem, onSelectQuestion, handleInteraction]);

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
      {showLoginPrompt && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          Please log in to interact with posts
        </div>
      )}
      <InfiniteScroll
        hasNextPage={hasNextPage}
        isLoading={isLoading}
        onLoadMore={onLoadMore}
        className="space-y-6"
      >
        {posts.map(post => (
          <article 
            key={post.id}
            className="relative"
          >
            {renderQuestion(post)}
          </article>
        ))}
      </InfiniteScroll>
    </div>
  );
} 