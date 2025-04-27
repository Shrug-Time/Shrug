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
import { getPostUrl, getAnswerUrl } from '@/utils/routes';
import Image from 'next/image';
import { TotemSelector } from '@/components/totem/TotemSelector';
import { Button } from '@/components/ui/button';

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
}

export function QuestionList({
  posts,
  onWantToAnswer,
  hasNextPage,
  isLoading,
  onLoadMore,
  showAllTotems = false,
  showUserAnswers = false,
  sectionId = 'default'
}: QuestionListProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toggleLike, loadPostTotems } = useTotem();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const queryClient = useQueryClient();
  const { isAuthModalOpen, setIsAuthModalOpen, handleAuthRequired } = useAuthModal();

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

  const getBestAnswer = useCallback((post: Post) => {
    if (!post.answers || post.answers.length === 0) return null;
    
    // Find the answer with the highest likes for any totem
    return post.answers.reduce((best, current, index) => {
      // Get the highest likes from any totem in the current answer
      const currentMaxLikes = current.totems?.reduce((max, totem) => 
        getTotemLikes(totem) > max ? getTotemLikes(totem) : max, 0) || 0;
      
      // Get the highest likes from any totem in the best answer so far
      const bestMaxLikes = best.answer.totems?.reduce((max, totem) => 
        getTotemLikes(totem) > max ? getTotemLikes(totem) : max, 0) || 0;
      
      return currentMaxLikes > bestMaxLikes ? { answer: current, index } : best;
    }, { answer: post.answers[0], index: 0 });
  }, []);

  const getBestTotem = useCallback((totems: Totem[]) => {
    if (!totems || totems.length === 0) return null;
    
    return totems.reduce((best, current) => {
      const bestLikes = getTotemLikes(best);
      const currentLikes = getTotemLikes(current);
      return currentLikes > bestLikes ? current : best;
    }, totems[0]);
  }, []);

  const renderTotemButton = (postId: string, totemName: string) => {
    return (
      <TotemButton
        key={totemName}
        totemName={totemName}
        postId={postId}
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

  const renderQuestion = useCallback((post: Post, index: number) => {
    const userAnswer = showUserAnswers && user 
      ? post.answers.find(answer => answer.firebaseUid === user.uid)
      : null;
    
    const answerToShow = userAnswer || (post.answers && post.answers.length > 0 ? post.answers[0] : null);
    const firstParagraph = answerToShow?.text?.split('\n')[0] || '';
    
    const topTotem = answerToShow?.totems?.reduce((top, current) => {
      const topLikes = getTotemLikes(top);
      const currentLikes = getTotemLikes(current);
      return currentLikes > topLikes ? current : top;
    }, answerToShow?.totems?.[0]);
    
    // Use index in the key to ensure uniqueness even when the same post appears in different sections
    const uniqueKey = `${sectionId}-${post.id}-${index}`;
    
    return (
      <div key={uniqueKey} className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-sm text-gray-500 mb-2">
          Posted by {post.username}
        </div>
        <div className="space-y-2">
          <Link href={getPostUrl(post.id)} className="block hover:bg-gray-50 rounded-lg transition-colors">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 hover:text-blue-600">{post.question}</h2>
          </Link>
          {firstParagraph && answerToShow && (
            answerToShow.id ? (
              <Link 
                href={getAnswerUrl(post.id, answerToShow.id)}
                className="block hover:bg-gray-50 rounded-lg transition-colors p-2"
              >
                <p className="text-gray-600">{firstParagraph}</p>
              </Link>
            ) : (
              <Link 
                href={getPostUrl(post.id)}
                className="block hover:bg-gray-50 rounded-lg transition-colors p-2"
              >
                <p className="text-gray-600">{firstParagraph}</p>
              </Link>
            )
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {topTotem && renderTotemButton(post.id, topTotem.name)}
          </div>
          <button
            onClick={() => handleAnswerClick(post)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            +
          </button>
        </div>
      </div>
    );
  }, [getTotemLikes, renderTotemButton, showUserAnswers, user, handleAuthRequired, sectionId]);

  // Calculate total likes for each post
  const postsWithLikes = posts.map(post => ({
    ...post,
    totalLikes: post.answers.reduce((sum, answer) => 
      sum + answer.totems.reduce((totemSum, totem) => 
        totemSum + getTotemLikes(totem), 0
      ), 0
    )
  }));

  // Sort posts by total likes
  const sortedPosts = [...postsWithLikes].sort((a, b) => b.totalLikes - a.totalLikes);

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
          {posts.map((post, index) => renderQuestion(post, index))}
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