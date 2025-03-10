import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Post, TotemSuggestion } from '@/types/models';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TotemButton } from '@/components/common/TotemButton';
import { auth } from '@/firebase';
import Link from 'next/link';
import { SimilarityService } from '@/services/similarity';

export interface QuestionListProps {
  posts: Post[];
  onSelectQuestion: (post: Post) => void;
  onLikeTotem: (post: Post, answerIdx: number, totemName: string, userId: string) => Promise<void>;
  onRefreshTotem: (post: Post, answerIdx: number, totemName: string, refreshCount: number) => Promise<any>;
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
  onRefreshTotem 
}: QuestionListProps) {
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [answerGroups, setAnswerGroups] = useState<Map<string, AnswerGroup[]>>();
  const router = useRouter();

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

  const handleTotemLike = useCallback((e: React.MouseEvent, post: Post, answerIdx: number, totemName: string) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    onLikeTotem(post, answerIdx, totemName, auth.currentUser.uid);
  }, [onLikeTotem]);

  const handleTotemRefresh = useCallback((e: React.MouseEvent, post: Post, answerIdx: number, totemName: string) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    onRefreshTotem(post, answerIdx, totemName, 0);
  }, [onRefreshTotem]);

  const renderAnswer = (post: Post, answerIndex: number, isSimilar = false) => {
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
        className={`p-4 ${isSimilar ? 'ml-8 border-l-4 border-blue-200' : ''}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-gray-700">
              <Link 
                href={`/profile/${answer.userId}`}
                className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                onClick={(e) => e.stopPropagation()}
                aria-label={`View ${answer.userName}'s profile`}
              >
                {answer.userName} ({answer.userId})
              </Link>
              <span className="text-gray-500" role="time" aria-label={`Posted ${formattedDate}`}>
                {' • '}
                {formattedDate}
              </span>
              <br />
              <button 
                className="cursor-pointer hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 -ml-1"
                onClick={() => navigateToPost(post.id)}
                aria-label="View full post"
              >
                {displayText}
              </button>
              {answer.text.length > displayText.length && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePostExpansion(post.id);
                  }}
                  className="ml-2 text-blue-500 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                  aria-expanded={isExpanded}
                  aria-controls={`answer-${post.id}-${answerIndex}`}
                >
                  {isExpanded ? 'Show Less' : 'Show More'}
                </button>
              )}
            </p>
          </div>
          {answer.totems.length > 0 && (
            <div className="ml-4 flex flex-wrap gap-2">
              {answer.totems.map((totem, idx) => (
                <TotemButton
                  key={`${totem.name}-${idx}`}
                  name={totem.name}
                  likes={totem.likes}
                  crispness={totem.crispness}
                  onLike={(e) => handleTotemLike(e, post, answerIndex, totem.name)}
                  onRefresh={(e) => handleTotemRefresh(e, post, answerIndex, totem.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

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

  if (!posts.length) {
    return (
      <p className="text-gray-600 text-center py-8" role="status">
        No posts available
      </p>
    );
  }

  return (
    <div className="space-y-6" role="feed" aria-label="Posts list">
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
                    {group.similarIndices.map(idx => renderAnswer(post, idx, true))}
                    
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
    </div>
  );
} 