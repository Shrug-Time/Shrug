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
import { USER_FIELDS } from '@/constants/fields';
import { getUserDisplayName, getTotemLikes, getTotemCrispness, hasUserLikedTotem } from '@/utils/componentHelpers';
import { onAuthStateChanged } from 'firebase/auth';

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

interface QuestionListProps {
  posts: Post[];
  onWantToAnswer: (post: Post) => void;
  onLikeTotem: (post: Post, answerIdx: number, totemName: string) => Promise<void>;
  onUnlikeTotem: (post: Post, answerIdx: number, totemName: string) => Promise<void>;
  currentUserId: string | null;
  hasNextPage: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  showAllTotems?: boolean;
}

export function QuestionList({
  posts,
  onWantToAnswer,
  onLikeTotem,
  onUnlikeTotem,
  currentUserId,
  hasNextPage,
  isLoading,
  onLoadMore,
  showAllTotems = false
}: QuestionListProps) {
  const router = useRouter();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const handleInteraction = useCallback(async (action: () => void | Promise<void>) => {
    if (!currentUserId) {
      setShowLoginPrompt(true);
      return;
    }
    try {
      await action();
    } catch (error) {
      console.error('Error handling interaction:', error);
    }
  }, [currentUserId]);

  const getBestAnswer = useCallback((post: Post) => {
    if (!post.answers || post.answers.length === 0) return null;
    
    // Find the answer with the highest likes for any totem
    return post.answers.reduce((best, current, index) => {
      // Get the highest likes from any totem in the current answer
      const currentMaxLikes = current.totems?.reduce((max, totem) => 
        totem.likes > max ? totem.likes : max, 0) || 0;
      
      // Get the highest likes from any totem in the best answer so far
      const bestMaxLikes = best.answer.totems?.reduce((max, totem) => 
        totem.likes > max ? totem.likes : max, 0) || 0;
      
      return currentMaxLikes > bestMaxLikes ? { answer: current, index } : best;
    }, { answer: post.answers[0], index: 0 });
  }, []);

  const getBestTotem = useCallback((answer: Answer) => {
    if (!answer.totems?.length) return null;
    
    // Find totem with the most likes
    return answer.totems.reduce((best, current) => {
      return getTotemLikes(current) > getTotemLikes(best) ? current : best;
    }, answer.totems[0]);
  }, []);

  const renderAnswer = useCallback((post: Post, answer: Answer, index: number, isBestAnswer: boolean = false) => {
    const bestTotem = getBestTotem(answer);

    if (!bestTotem) return null;

    const isLiked = currentUserId ? hasUserLikedTotem(bestTotem, currentUserId) : false;
    console.log('QuestionList - Rendering answer:', { 
      totemName: bestTotem.name, 
      isLiked, 
      currentUserId,
      likeHistory: bestTotem.likeHistory
    });

    return (
      <div key={`${post.id}-${answer.text}`} 
           className={`bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow ${isBestAnswer ? 'border-l-4 border-blue-500' : ''}`}>
        <div className="text-gray-600 mb-4">
          {answer.text}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TotemButton
              key={bestTotem.name}
              name={bestTotem.name}
              likes={getTotemLikes(bestTotem)}
              crispness={getTotemCrispness(bestTotem)}
              isLiked={isLiked}
              onLike={() => handleInteraction(() => onLikeTotem(post, index, bestTotem.name))}
              onUnlike={() => handleInteraction(() => onUnlikeTotem(post, index, bestTotem.name))}
              postId={post.id}
            />
            {answer.totems && answer.totems.length > 1 && (
              <span className="text-sm text-gray-500">
                +{answer.totems.length - 1} more totems
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(answer.createdAt, { addSuffix: true })} by {getUserDisplayName(answer)}
          </div>
        </div>
      </div>
    );
  }, [handleInteraction, onLikeTotem, onUnlikeTotem, getBestTotem, currentUserId]);

  const renderQuestion = useCallback((post: Post) => {
    const bestAnswer = getBestAnswer(post);
    
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/post/${post.id}`} className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 hover:text-blue-600">
              {post.question}
            </h2>
          </Link>
          <button
            onClick={(e) => {
              console.log('Direct button click detected');
              e.preventDefault();
              e.stopPropagation();
              console.log('Add answer button clicked for post:', post.id);
              handleInteraction(() => {
                console.log('handleInteraction called for post:', post.id);
                onWantToAnswer(post);
              });
            }}
            className="ml-4 w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md transition-colors"
            aria-label="Add answer"
          >
            +
          </button>
        </div>

        {bestAnswer && (
          <div className="text-gray-600 mb-4">
            {bestAnswer.answer.text}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {bestAnswer ? (
              <>
                {(() => {
                  const bestTotem = getBestTotem(bestAnswer.answer);
                  return bestTotem && (
                    <>
                      <TotemButton
                        key={bestTotem.name}
                        name={bestTotem.name}
                        likes={getTotemLikes(bestTotem)}
                        crispness={getTotemCrispness(bestTotem)}
                        isLiked={currentUserId ? hasUserLikedTotem(bestTotem, currentUserId) : false}
                        onLike={() => handleInteraction(() => onLikeTotem(post, bestAnswer.index, bestTotem.name))}
                        onUnlike={() => handleInteraction(() => onUnlikeTotem(post, bestAnswer.index, bestTotem.name))}
                        postId={post.id}
                      />
                      {bestAnswer.answer.totems && bestAnswer.answer.totems.length > 1 && (
                        <span className="text-sm text-gray-500">
                          +{bestAnswer.answer.totems.length - 1} more totems
                        </span>
                      )}
                      <span className="text-sm text-gray-500 ml-2">
                        {post.answers.length} answers
                      </span>
                    </>
                  );
                })()}
              </>
            ) : (
              <span className="text-sm text-gray-500">
                No answers yet
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(toDate(post.createdAt), { addSuffix: true })} by {getUserDisplayName(post)}
          </div>
        </div>
      </div>
    );
  }, [onLikeTotem, onUnlikeTotem, onWantToAnswer, handleInteraction, getBestAnswer, getBestTotem, currentUserId]);

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