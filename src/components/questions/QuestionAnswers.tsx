// QuestionAnswers.tsx - Updated with reactive sorting and crispness fixes
// Cache-busting comment: v2.0 - no debug logs, immediate updates
import { Post, Answer, Totem } from '@/types/models';
import { formatDistanceToNow } from 'date-fns';
import { TotemButton } from '@/components/totem/TotemButton';
import { getTotemLikes, getUserDisplayName } from '@/utils/componentHelpers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { AnswerModal } from '@/components/answers/AnswerModal';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthModal } from '@/hooks/useAuthModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { getAnswerUrl, getPostUrl, getProfileUrl } from '@/utils/routes';
import { ReportButton } from '@/components/reports/ReportButton';
import { useTotem } from '@/contexts/TotemContext';

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

interface QuestionAnswersProps {
  post: Post;
}

export function QuestionAnswers({ post }: QuestionAnswersProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const [expandedTotems, setExpandedTotems] = useState<Set<string>>(new Set());
  const { isAuthModalOpen, setIsAuthModalOpen, handleAuthRequired } = useAuthModal();
  const { getCrispness } = useTotem();

  const handleAnswerSubmitted = () => {
    setSelectedQuestion(null);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const handleAnswerClick = () => {
    handleAuthRequired(() => {
      setSelectedQuestion(post);
    });
  };

  const toggleExpanded = (totemName: string) => {
    setExpandedTotems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(totemName)) {
        newSet.delete(totemName);
      } else {
        newSet.add(totemName);
      }
      return newSet;
    });
  };

  // Calculate sorted totems reactively - updates when totem states change
  const sortedTotems = useMemo(() => {
    // Create individual answer-totem pairs for ranking
    const answerTotemPairs: Array<{
      answer: Answer;
      totem: Totem;
      likes: number;
      crispness: number;
    }> = [];

    post.answers.forEach(answer => {
      answer.totems.forEach(totem => {
        answerTotemPairs.push({
          answer,
          totem,
          likes: getTotemLikes(totem),
          crispness: getCrispness(post.id, totem.name) || 0
        });
      });
    });

    // Sort individual answer-totem pairs by likes (descending), then by crispness (descending)
    const sortedPairs = answerTotemPairs.sort((a, b) => {
      // Primary sort: individual totem likes (descending)
      if (a.likes !== b.likes) {
        return b.likes - a.likes;
      }
      
      // Tie-breaker: totem crispness (descending)
      return b.crispness - a.crispness;
    });

    // Group sorted pairs by totem while preserving sort order
    const result: Array<{
      totemName: string;
      answers: typeof sortedPairs;
      totalLikes: number;
      averageCrispness: number;
    }> = [];

    const seenTotems = new Set<string>();

    sortedPairs.forEach(pair => {
      if (!seenTotems.has(pair.totem.name)) {
        seenTotems.add(pair.totem.name);
        
        // Get all pairs for this totem (they're already sorted)
        const totemPairs = sortedPairs.filter(p => p.totem.name === pair.totem.name);
        
        result.push({
          totemName: pair.totem.name,
          answers: totemPairs,
          totalLikes: totemPairs.reduce((sum, { likes }) => sum + likes, 0),
          averageCrispness: totemPairs.length > 0 
            ? totemPairs.reduce((sum, { crispness }) => sum + crispness, 0) / totemPairs.length 
            : 0
        });
      }
    });

    return result;
  }, [
    post.answers, 
    post.id, 
    getCrispness,
    // Include all totem names to trigger re-calculation when their states change
    ...post.answers.flatMap(answer => answer.totems.map(totem => totem.name)),
    // Include current crispness values to detect when they change
    ...post.answers.flatMap(answer => 
      answer.totems.map(totem => getCrispness(post.id, totem.name))
    )
  ]); // Re-calculate when answers or any totem state changes

  if (sortedTotems.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-500 py-8">
          No answers yet
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => setSelectedQuestion(post)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add First Answer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <button
          onClick={handleAnswerClick}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          +
        </button>
      </div>

      {/* Totem Pole Layout */}
      <div className="relative">
        {sortedTotems.map(({ totemName, answers }, index) => {
          const isExpanded = expandedTotems.has(totemName);
          const hasMultipleAnswers = answers.length > 1;
          const answersToShow = isExpanded ? answers.slice(0, 5) : [answers[0]];

          return (
            <div key={totemName} className="relative flex items-center gap-4 mb-6">
              {/* Number Circle */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                {/* Connecting Line */}
                {index < sortedTotems.length - 1 && (
                  <div className="w-0.5 h-16 bg-blue-400 mt-2"></div>
                )}
              </div>

              {/* Totem Card */}
              <div className="flex-1 bg-white rounded-xl shadow p-4">
                {/* Answers */}
                <div className="space-y-4">
                  {answersToShow.map((answerData, answerIndex) => (
                    <div key={`${answerData.answer.id}-${answerIndex}`}>
                      <Link 
                        className="group cursor-pointer block"
                        href={getAnswerUrl(post.id, answerData.answer.id)}
                        title="View full answer"
                      >
                        <div className="text-gray-600 mb-3">
                          {answerData.answer.text}
                        </div>
                      </Link>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <TotemButton 
                            totemName={answerData.totem.name}
                            postId={post.id}
                          />
                          {answerData.answer.totems.length > 1 && (
                            <span className="text-sm text-gray-500">
                              +{answerData.answer.totems.length - 1} more totems
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-500">
                            {formatDistanceToNow(toDate(answerData.answer.createdAt), { addSuffix: true })} by{' '}
                            <Link 
                              href={getProfileUrl(answerData.answer.username || answerData.answer.firebaseUid || '')}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {getUserDisplayName(answerData.answer)}
                            </Link>
                          </div>
                          <ReportButton 
                            contentId={answerData.answer.id} 
                            contentType="answer" 
                            iconOnly={true}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show More/Less Button */}
                {hasMultipleAnswers && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => toggleExpanded(totemName)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {isExpanded 
                        ? 'Show less' 
                        : `Show more (${Math.min(answers.length - 1, 4)} more answers)`
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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