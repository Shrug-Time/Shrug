import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Post, TotemSuggestion, Answer, Totem } from '@/types/models';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TotemButton } from '@/components/totem/TotemButtonV2';
import Link from 'next/link';
import { SimilarityService } from '@/services/similarity';
import { InfiniteScroll } from '@/components/common/InfiniteScroll';
import { USER_FIELDS } from '@/constants/fields';
import { getUserDisplayName, getTotemLikes, getTotemCrispness, hasUserLikedTotem } from '@/utils/componentHelpers';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { useAuth } from '@/contexts/AuthContext';

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
}

export function QuestionList({
  posts,
  onWantToAnswer,
  hasNextPage,
  isLoading,
  onLoadMore,
  showAllTotems = false
}: QuestionListProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toggleLike, loadPostTotems } = useTotemV2();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Load initial state of likes for all posts
  useEffect(() => {
    if (!user) return;

    const loadAllPostsTotems = async () => {
      for (const post of posts) {
        const totemNames = post.answers.flatMap(answer => 
          answer.totems.map(totem => totem.name)
        );
        await loadPostTotems(post.id, totemNames);
      }
    };

    loadAllPostsTotems();
  }, [posts, user, loadPostTotems]);

  console.log('[QuestionList] Rendering with posts:', posts.length);

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
    console.log('[QuestionList] Rendering totem button:', { postId, totemName });
    return (
      <TotemButton
        key={totemName}
        totemName={totemName}
        postId={postId}
      />
    );
  };

  const renderAnswer = useCallback((post: Post, answer: Answer, index: number, isBestAnswer: boolean = false) => {
    const bestTotem = getBestTotem(answer.totems);

    if (!bestTotem) return null;

    const isLiked = user ? hasUserLikedTotem(bestTotem, user.uid) : false;

    return (
      <div key={`${post.id}-${answer.text}`} 
           className={`bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow ${isBestAnswer ? 'border-l-4 border-blue-500' : ''}`}>
        <div className="text-gray-600 mb-4">
          {answer.text}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {renderTotemButton(post.id, bestTotem.name)}
            {answer.totems && answer.totems.length > 1 && (
              <span className="text-sm text-gray-500">
                +{answer.totems.length - 1} more totems
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(toDate(answer.createdAt), { addSuffix: true })} by {getUserDisplayName(answer)}
          </div>
        </div>
      </div>
    );
  }, [getBestTotem, user, renderTotemButton]);

  const renderQuestion = useCallback((post: Post) => {
    const bestAnswer = getBestAnswer(post);
    
    return (
      <div key={post.id} className="bg-white rounded-lg shadow p-4 mb-4">
        <Link href={`/post/${post.id}`} className="block hover:bg-gray-50 rounded-lg transition-colors">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 hover:text-blue-600">{post.question}</h2>
        </Link>
        <div className="flex flex-wrap gap-2">
          {post.answers.map((answer, idx) => (
            <div key={idx} className="flex flex-wrap gap-2">
              {answer.totems.map((totem) => renderTotemButton(post.id, totem.name))}
            </div>
          ))}
        </div>
      </div>
    );
  }, [getBestAnswer, renderTotemButton]);

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