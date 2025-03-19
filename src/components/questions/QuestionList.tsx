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
import { getUserDisplayName, getTotemLikes, getTotemCrispness } from '@/utils/componentHelpers';

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
    // Get only the highest-liked totem for this answer
    const bestTotem = getBestTotem(answer);

    if (!bestTotem) return null;

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
              onLike={() => handleInteraction(() => onLikeTotem(post, index, bestTotem.name))}
              onRefresh={() => handleInteraction(() => onRefreshTotem(post, index, bestTotem.name))}
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
  }, [handleInteraction, onLikeTotem, onRefreshTotem, getBestTotem]);

  const renderQuestion = useCallback((post: Post) => {
    const bestAnswer = getBestAnswer(post);
    
    // If we're showing all answers (question page view)
    if (showAllTotems && post.answers.length > 0) {
      // Group answers by their best totem
      const answersByTotem = post.answers.reduce((groups, answer, index) => {
        const bestTotem = getBestTotem(answer);
        if (!bestTotem) return groups;

        if (!groups[bestTotem.name]) {
          groups[bestTotem.name] = [];
        }
        groups[bestTotem.name].push({ answer, index });
        return groups;
      }, {} as Record<string, { answer: Answer; index: number }[]>);

      // For each totem group, get the answer with the highest likes
      const bestAnswersPerTotem = Object.entries(answersByTotem).map(([totemName, answers]) => {
        // Sort answers in this group by their totem's likes
        const sortedAnswers = answers.sort((a, b) => {
          const aTotem = a.answer.totems?.find(t => t.name === totemName);
          const bTotem = b.answer.totems?.find(t => t.name === totemName);
          return (bTotem?.likes || 0) - (aTotem?.likes || 0);
        });
        return sortedAnswers[0]; // Return the answer with highest likes for this totem
      });

      // Sort the best answers by their totem likes
      const sortedBestAnswers = bestAnswersPerTotem.sort((a, b) => {
        const aTotem = getBestTotem(a.answer);
        const bTotem = getBestTotem(b.answer);
        return (bTotem?.likes || 0) - (aTotem?.likes || 0);
      });

      return (
        <div className="space-y-4">
          {sortedBestAnswers.map(({ answer, index }) => {
            const bestTotem = getBestTotem(answer);
            const totalAnswersWithTotem = answersByTotem[bestTotem?.name || ''].length;
            
            return (
              <div key={`${post.id}-${answer.text}`} 
                   className={`bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow ${answer === bestAnswer?.answer ? 'border-l-4 border-blue-500' : ''}`}>
                <div className="text-gray-600 mb-4">
                  {answer.text}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {bestTotem && (
                      <>
                        <TotemButton
                          key={bestTotem.name}
                          name={bestTotem.name}
                          likes={getTotemLikes(bestTotem)}
                          crispness={getTotemCrispness(bestTotem)}
                          onLike={() => handleInteraction(() => onLikeTotem(post, index, bestTotem.name))}
                          onRefresh={() => handleInteraction(() => onRefreshTotem(post, index, bestTotem.name))}
                          postId={post.id}
                        />
                        {totalAnswersWithTotem > 1 && (
                          <span className="text-sm text-gray-500">
                            +{totalAnswersWithTotem - 1} more answers with this totem
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {formatDistanceToNow(answer.createdAt, { addSuffix: true })} by {getUserDisplayName(answer)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    // Main page view - show only the best answer
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
            {bestAnswer && (
              <div className="text-gray-600">
                {bestAnswer.answer.text}
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
                        onLike={() => handleInteraction(() => onLikeTotem(post, bestAnswer.index, bestTotem.name))}
                        onRefresh={() => handleInteraction(() => onRefreshTotem(post, bestAnswer.index, bestTotem.name))}
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
  }, [onLikeTotem, onRefreshTotem, onSelectQuestion, handleInteraction, getBestAnswer, getBestTotem]);

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