import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Post, TotemSuggestion, Answer, Totem } from '@/types/models';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TotemButton } from '@/components/totem/TotemButton';
import Link from 'next/link';
import { SimilarityService } from '@/services/similarity';
import { InfiniteScroll } from '@/components/common/InfiniteScroll';
import { USER_FIELDS } from '@/constants/fields';
import { getUserDisplayName, getTotemLikes, getTotemCrispness, hasUserLikedTotem } from '@/utils/componentHelpers';
import { useTotem } from '@/contexts/TotemContext';
import { useAuth } from '@/contexts/AuthContext';
import { AnswerModal } from '@/components/answers/AnswerModal';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthModal } from '@/hooks/useAuthModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { getPostUrl, getAnswerUrl, getProfileUrl } from '@/utils/routes';
import Image from 'next/image';
import { TotemSelector } from '@/components/totem/TotemSelector';
import { Button } from '@/components/ui/button';
import { ReportButton } from '@/components/reports/ReportButton';
import { FormattedText, truncateAnswerPreview } from '@/utils/textFormatting';
import { useDeleteAnswer } from '@/hooks/useDeleteAnswer';

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
  hasNextPage: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  showAllTotems?: boolean;
  showUserAnswers?: boolean;
  sectionId?: string;
  showDeleteButtons?: boolean;
  sortByCrispness?: boolean;
}

export function QuestionList({
  posts,
  onWantToAnswer,
  hasNextPage,
  isLoading,
  onLoadMore,
  showAllTotems = false,
  showUserAnswers = false,
  sectionId = 'default',
  showDeleteButtons = false,
  sortByCrispness = false
}: QuestionListProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toggleLike, loadPostTotems, getCrispness } = useTotem();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const queryClient = useQueryClient();
  const { isAuthModalOpen, setIsAuthModalOpen, handleAuthRequired } = useAuthModal();
  const { deleteAnswer, isDeleting } = useDeleteAnswer();

  // Load initial state of likes for all posts
  useEffect(() => {
    if (!user) return;

    const loadTotemsOnce = async () => {
      if (posts.length === 0) return;

      const uniqueTotemNames = new Set<string>();
      
      posts.forEach(post => {
        if (post.answers) {
          post.answers.forEach(answer => {
            if (answer.totems) {
              answer.totems.forEach(totem => {
                uniqueTotemNames.add(totem.name);
              });
            }
          });
        }
      });
      
      const totemNamesArray = Array.from(uniqueTotemNames);
      
      if (totemNamesArray.length > 0) {
        for (const post of posts) {
          await loadPostTotems(post.id, totemNamesArray);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    };

    const postsKey = posts.map(p => p.id).join(',');
    loadTotemsOnce();
  }, [posts.length, user, loadPostTotems]);

  const handleInteraction = useCallback(async (action: () => void | Promise<void>) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    try {
      await action();
    } catch (error) {
      console.error('Error handling interaction:', error);
    }
  }, [user]);

  const getMaxCrispness = useCallback((post: Post): number => {
    if (!post.answers || post.answers.length === 0) return 0;
    
    let maxCrispness = 0;
    post.answers.forEach(answer => {
      answer.totems.forEach(totem => {
        // Use live crispness from TotemContext, fallback to stored value
        const contextCrispness = getCrispness(post.id, totem.name, answer.id);
        const crispness = contextCrispness !== undefined ? contextCrispness : (totem.crispness || 0);
        maxCrispness = Math.max(maxCrispness, crispness);
      });
    });
    
    return maxCrispness;
  }, [getCrispness]);

  const getBestAnswer = useCallback((post: Post) => {
    if (!post.answers || post.answers.length === 0) return null;
    
    // Use the same sorting logic as QuestionAnswers: individual totem comparison with live crispness
    const answerTotemPairs: Array<{
      answer: Answer;
      totem: Totem;
      likes: number;
      crispness: number;
      answerIndex: number;
    }> = [];

    post.answers.forEach((answer, answerIndex) => {
      answer.totems.forEach(totem => {
        const likes = getTotemLikes(totem);
        // Use live crispness from TotemContext, fallback to stored value
        const contextCrispness = getCrispness(post.id, totem.name, answer.id);
        const crispness = contextCrispness !== undefined ? contextCrispness : (totem.crispness || 0);
        
        answerTotemPairs.push({
          answer,
          totem,
          likes,
          crispness,
          answerIndex
        });
      });
    });

    // Sort by likes first, then crispness (same as QuestionAnswers)
    answerTotemPairs.sort((a, b) => {
      if (a.likes !== b.likes) {
        return b.likes - a.likes; // Higher likes first
      }
      return b.crispness - a.crispness; // Higher crispness first
    });

    // Return the top answer (first in sorted list)
    const topPair = answerTotemPairs[0];
    if (!topPair) return null;
    
    return { answer: topPair.answer, index: topPair.answerIndex };
  }, []);

  const getBestTotem = useCallback((totems: Totem[]) => {
    if (!totems || totems.length === 0) return null;
    
    return totems.reduce((best, current) => {
      const bestLikes = getTotemLikes(best);
      const currentLikes = getTotemLikes(current);
      
      // Primary comparison: likes
      if (currentLikes > bestLikes) {
        return current;
      } else if (currentLikes === bestLikes) {
        // Tiebreaker: crispness
        const bestCrispness = best.crispness || 0;
        const currentCrispness = current.crispness || 0;
        return currentCrispness > bestCrispness ? current : best;
      }
      
      return best;
    }, totems[0]);
  }, []);

  const renderTotemButton = (postId: string, totemName: string, answerId?: string) => {
    return (
      <TotemButton
        key={totemName}
        totemName={totemName}
        postId={postId}
        answerId={answerId}
      />
    );
  };

  const handleAnswerSubmitted = () => {
    setSelectedQuestion(null);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    if (onWantToAnswer) {
      onWantToAnswer(selectedQuestion!);
    }
  };

  const handleAnswerClick = (post: Post) => {
    handleAuthRequired(() => {
      setSelectedQuestion(post);
    });
  };

  const handleDeleteAnswer = async (post: Post, answerId: string) => {
    if (!confirm('Are you sure you want to delete this answer? This action cannot be undone.')) {
      return;
    }

    try {
      const success = await deleteAnswer(post.id, answerId);
      if (success) {
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        queryClient.invalidateQueries({ queryKey: ['userPosts'] });
        queryClient.invalidateQueries({ queryKey: ['userAnswers'] });
      }
    } catch (error) {
      console.error('Error deleting answer:', error);
    }
  };

  const renderQuestion = useCallback((post: Post, index: number) => {
    const userAnswer = showUserAnswers && user 
      ? post.answers.find(answer => answer.firebaseUid === user.uid)
      : null;
    
    const answerToShow = userAnswer || (post.answers && post.answers.length > 0 ? getBestAnswer(post)?.answer : null);
    const previewText = answerToShow?.text ? truncateAnswerPreview(answerToShow.text) : '';
    
    const topTotem = answerToShow?.totems?.reduce((top, current) => {
      const topLikes = getTotemLikes(top);
      const currentLikes = getTotemLikes(current);
      return currentLikes > topLikes ? current : top;
    }, answerToShow?.totems?.[0]);
    
    
    // Use index in the key to ensure uniqueness even when the same post appears in different sections
    const uniqueKey = `${sectionId}-${post.id}-${index}`;
    
    return (
      <div key={uniqueKey} className="bg-white rounded-lg shadow p-3 mb-3">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>
            Posted by{' '}
            <Link 
              href={getProfileUrl(post.username || post.firebaseUid || '')}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {post.username || 'Anonymous'}
            </Link>
          </span>
          <ReportButton
            contentId={post.id}
            contentType="post"
            iconOnly={true}
            className="text-gray-400 hover:text-red-500"
          />
        </div>
        <div className="space-y-2">
          <Link href={getPostUrl(post.id)} className="block hover:bg-gray-50 rounded-lg transition-colors">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 hover:text-blue-600">{post.question}</h2>
          </Link>
          {previewText && answerToShow && (
            answerToShow.id ? (
              <Link 
                href={getAnswerUrl(post.id, answerToShow.id)}
                className="block hover:bg-gray-50 rounded-lg transition-colors p-2"
              >
                <div className="text-gray-600 text-sm line-clamp-2">
                  <FormattedText text={previewText} disableLinks={true} />
                </div>
              </Link>
            ) : (
              <Link 
                href={getPostUrl(post.id)}
                className="block hover:bg-gray-50 rounded-lg transition-colors p-2"
              >
                <div className="text-gray-600 text-sm line-clamp-2">
                  <FormattedText text={previewText} disableLinks={true} />
                </div>
              </Link>
            )
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2">
            {topTotem && answerToShow && renderTotemButton(post.id, topTotem.name, answerToShow.id)}
          </div>
          <div className="flex items-center space-x-2">
            {/* Show delete button for user's own answers only on profile pages */}
            {showDeleteButtons && answerToShow && user && answerToShow.firebaseUid === user.uid && answerToShow.id && (
              <button
                onClick={() => handleDeleteAnswer(post, answerToShow.id)}
                disabled={isDeleting}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete answer"
              >
                {isDeleting ? '...' : '×'}
              </button>
            )}
            <button
              onClick={() => handleAnswerClick(post)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              +
            </button>
          </div>
        </div>
      </div>
    );
  }, [getTotemLikes, renderTotemButton, showUserAnswers, user, handleAuthRequired, sectionId, handleDeleteAnswer, isDeleting]);

  // Calculate sorting values for each post
  const postsWithSortingValues = posts.map(post => ({
    ...post,
    totalLikes: post.answers.reduce((sum, answer) => 
      sum + answer.totems.reduce((totemSum, totem) => 
        totemSum + getTotemLikes(totem), 0
      ), 0
    ),
    maxCrispness: sortByCrispness ? getMaxCrispness(post) : 0
  }));

  // Sort posts by crispness or likes depending on sortByCrispness prop
  const sortedPosts = [...postsWithSortingValues].sort((a, b) => {
    if (sortByCrispness) {
      return b.maxCrispness - a.maxCrispness;
    }
    return b.totalLikes - a.totalLikes;
  });

  if (!posts.length && !isLoading) {
    return (
      <div className="text-center text-gray-500 py-8">
        No questions found
      </div>
    );
  }

  return (
    <>
      <InfiniteScroll
        onLoadMore={onLoadMore}
        hasNextPage={hasNextPage}
        isLoading={isLoading}
      >
        <div className="space-y-4">
          {sortedPosts.slice(0, 10).map((post, index) => renderQuestion(post, index))}
        </div>
      </InfiniteScroll>

      {selectedQuestion && (
        <AnswerModal
          isOpen={!!selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          selectedQuestion={selectedQuestion}
          onAnswerSubmitted={handleAnswerSubmitted}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
} 