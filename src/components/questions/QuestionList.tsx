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
  onLikeTotem: (postId: string, totemName: string) => Promise<void>;
  onRefreshTotem: (postId: string, totemName: string) => Promise<void>;
  showAllTotems?: boolean;
  hasNextPage?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
}

interface AnswerGroup {
  mainIndex: number;
  similarIndices: number[];
  suggestions: TotemSuggestion[];
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
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [answerGroups, setAnswerGroups] = useState<Map<string, AnswerGroup[]>>();
  const router = useRouter();

  const getTopTotem = useCallback((totems: any[]) => {
    return [...totems].sort((a, b) => b.likes - a.likes)[0];
  }, []);

  useEffect(() => {
    // Process answer groups for each post
    const groups = new Map<string, AnswerGroup[]>();
    
    posts.forEach(post => {
      if (post.answers.length > 1) {
        const { groups: similarGroups, suggestions } = SimilarityService.groupSimilarAnswers(post.answers);
        
        const postGroups: AnswerGroup[] = [];
        similarGroups.forEach((similarIndices, mainIndex) => {
          postGroups.push({
            mainIndex,
            similarIndices,
            suggestions: suggestions.get(mainIndex) || []
          });
        });
        
        if (postGroups.length > 0) {
          groups.set(post.id, postGroups);
        }
      }
    });
    
    setAnswerGroups(groups);
  }, [posts]);

  const togglePostExpansion = useCallback((postId: string) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }, []);

  const truncateText = useCallback((text: string) => {
    const firstParagraph = text.split('\n')[0];
    if (firstParagraph.length > 150) {
      return firstParagraph.substring(0, 150) + '...';
    }
    return firstParagraph;
  }, []);

  const navigateToPost = useCallback((postId: string) => {
    router.push(`/post/${postId}`);
  }, [router]);

  const handleTotemLikeForTotem = useCallback((post: Post, answerIndex: number, totemName: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    onLikeTotem(post.id, totemName);
  }, [onLikeTotem]);

  const handleTotemRefreshForTotem = useCallback((post: Post, answerIndex: number, totemName: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    onRefreshTotem(post.id, totemName);
  }, [onRefreshTotem]);

  const renderTotems = useCallback((post: Post, answerIndex: number) => {
    if (!post.answers?.[answerIndex]?.totems?.length) {
      return null;
    }

    const totems = post.answers[answerIndex].totems;
    const sortedTotems = [...totems].sort((a, b) => b.likes - a.likes);
    
    if (!showAllTotems) {
      // Only show the top totem in the main view
      const topTotem = sortedTotems[0];
      return (
        <div key={`${post.id}-${answerIndex}-${topTotem.name}`} className="mb-2">
          <TotemButton
            name={topTotem.name}
            likes={topTotem.likes}
            crispness={topTotem.crispness}
            onLike={() => onLikeTotem(post.id, topTotem.name)}
            onRefresh={() => onRefreshTotem(post.id, topTotem.name)}
          />
          {totems.length > 1 && (
            <Link
              href={`/question/${post.id}`}
              className="ml-2 text-sm text-blue-500 hover:text-blue-600"
            >
              See {totems.length - 1} more totems
            </Link>
          )}
        </div>
      );
    }

    // Show all totems in detail view
    return (
      <div key={`${post.id}-${answerIndex}`} className="space-y-2">
        {sortedTotems.map((totem) => (
          <div key={`${post.id}-${answerIndex}-${totem.name}`} className="flex items-center">
            <TotemButton
              name={totem.name}
              likes={totem.likes}
              crispness={totem.crispness}
              onLike={() => onLikeTotem(post.id, totem.name)}
              onRefresh={() => onRefreshTotem(post.id, totem.name)}
            />
          </div>
        ))}
      </div>
    );
  }, [showAllTotems, onLikeTotem, onRefreshTotem]);

  const renderAnswer = useCallback((post: Post, answerIndex: number) => {
    const answer = post.answers[answerIndex];
    if (!answer) return null;

    const isExpanded = expandedPosts[post.id];
    const displayText = isExpanded ? answer.text : truncateText(answer.text);
    const formattedDate = answer.createdAt ? 
      formatDistanceToNow(
        typeof answer.createdAt === 'number' 
          ? new Date(answer.createdAt) 
          : (answer.createdAt as Timestamp).toDate(), 
        { addSuffix: true }
      ) : "Just now";

    return (
      <div 
        key={`${post.id}-${answerIndex}`}
        className="bg-white rounded-lg p-4 shadow-sm"
      >
        <div className="mb-2">
          <span className="text-gray-600">{displayText}</span>
        </div>
        {renderTotems(post, answerIndex)}
      </div>
    );
  }, [expandedPosts, truncateText, renderTotems]);

  const renderSuggestedTotems = (suggestions: TotemSuggestion[]) => {
    if (!suggestions.length) return null;

    return (
      <div className="mt-2 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Suggested Totems:</h4>
        <div className="flex flex-wrap gap-2">
          {suggestions.map(suggestion => (
            <div
              key={suggestion.totemName}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              title={suggestion.reason}
            >
              {suggestion.totemName} ({Math.round(suggestion.confidence * 100)}%)
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!posts.length && !isLoading) {
    return (
      <p className="text-gray-600 text-center py-8" role="status">
        No posts available
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
      {posts.map((post) => {
        const postGroups = answerGroups?.get(post.id) || [];
        const hasGroups = postGroups.length > 0;

        return (
          <article 
            key={post.id} 
            className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow"
            role="article"
            aria-labelledby={`question-${post.id}`}
          >
            <h2 
              id={`question-${post.id}`}
              className="text-xl font-bold mb-2"
            >
              {post.question}
            </h2>

            {/* Render grouped answers */}
            {hasGroups ? (
              <div className="mt-4 space-y-4">
                {postGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="border rounded-lg overflow-hidden">
                    {/* Main answer */}
                    {renderAnswer(post, group.mainIndex)}
                    
                    {/* Similar answers */}
                    {group.similarIndices.map(idx => renderAnswer(post, idx))}
                    
                    {/* Totem suggestions */}
                    {renderSuggestedTotems(group.suggestions)}
                  </div>
                ))}
                
                {/* Render remaining answers */}
                {post.answers
                  .filter((_, idx) => !postGroups.some(g => 
                    g.mainIndex === idx || g.similarIndices.includes(idx)
                  ))
                  .map((_, idx) => renderAnswer(post, idx))}
              </div>
            ) : (
              // Render answers normally if no groups
              <div className="mt-4 space-y-4">
                {post.answers.map((_, idx) => renderAnswer(post, idx))}
              </div>
            )}

            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => onSelectQuestion(post)}
                className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Write an answer to this question"
              >
                Write Answer
              </button>
              {post.answers.length > 1 && !hasGroups && (
                <button 
                  onClick={() => navigateToPost(post.id)}
                  className="text-blue-500 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                  aria-label={`View ${post.answers.length - 1} more totems`}
                >
                  See More Totems ({post.answers.length - 1} more)
                </button>
              )}
            </div>
          </article>
        );
      })}
    </InfiniteScroll>
  );
} 