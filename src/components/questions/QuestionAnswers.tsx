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
import { getAnswerUrl, getPostUrl, getProfileUrl, getTotemUrl } from '@/utils/routes';
import { ReportButton } from '@/components/reports/ReportButton';
import { useTotem } from '@/contexts/TotemContext';
import { FormattedText, truncateAnswerPreview } from '@/utils/textFormatting';

// Custom hook for answer functionality
export function useAnswerModal() {
  const queryClient = useQueryClient();
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const { handleAuthRequired } = useAuthModal();

  const handleAnswerSubmitted = () => {
    setSelectedQuestion(null);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const handleAnswerClick = (post: Post) => {
    handleAuthRequired(() => {
      setSelectedQuestion(post);
    });
  };

  return {
    selectedQuestion,
    setSelectedQuestion,
    handleAnswerSubmitted,
    handleAnswerClick
  };
}

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
  showAddButton?: boolean;
}

export function QuestionAnswers({ post, showAddButton = false }: QuestionAnswersProps) {
  const router = useRouter();
  const { isAuthModalOpen, setIsAuthModalOpen } = useAuthModal();
  const { getCrispness } = useTotem();
  const { selectedQuestion, setSelectedQuestion, handleAnswerSubmitted, handleAnswerClick } = useAnswerModal();

  const handleAnswerClickLocal = () => {
    handleAnswerClick(post);
  };

  // Create a stable dependency array for totem names
  const totemNames = useMemo(() => 
    post.answers.flatMap(answer => 
      answer.totems.map(totem => totem.name)
    ).sort(), // Sort to ensure stable order
    [post.answers]
  );

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
        const likes = getTotemLikes(totem);
        const contextCrispness = getCrispness(post.id, totem.name, answer.id);
        const crispness = contextCrispness !== undefined ? contextCrispness : (totem.crispness || 0);
        
        answerTotemPairs.push({
          answer,
          totem,
          likes,
          crispness
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

    // Group pairs by totem name (case-insensitive) and rank groups by their best pair
    const totemGroups = new Map<string, {
      displayName: string;
      pairs: typeof sortedPairs;
      bestLikes: number;
      bestCrispness: number;
    }>();

    // Since sortedPairs is already sorted desc, first encounter of each name is the best
    sortedPairs.forEach(pair => {
      const key = pair.totem.name.toLowerCase();
      if (!totemGroups.has(key)) {
        totemGroups.set(key, {
          displayName: pair.totem.name,
          pairs: [],
          bestLikes: pair.likes,
          bestCrispness: pair.crispness,
        });
      }
      totemGroups.get(key)!.pairs.push(pair);
    });

    // Sort groups by their best pair's stats
    const sortedGroups = Array.from(totemGroups.values()).sort((a, b) => {
      if (a.bestLikes !== b.bestLikes) return b.bestLikes - a.bestLikes;
      return b.bestCrispness - a.bestCrispness;
    });

    return sortedGroups.map(group => ({
      totemName: group.displayName,
      answers: group.pairs,
      totalLikes: group.pairs.reduce((sum, p) => sum + p.likes, 0),
      averageCrispness: group.pairs.reduce((sum, p) => sum + p.crispness, 0) / group.pairs.length,
      children: [] as Array<{ totemName: string; answers: unknown[] }>
    }));
  }, [
    post.answers, 
    post.id, 
    getCrispness,
    getTotemLikes,
    totemNames
  ]); // Re-calculate when answers or any totem state changes

  if (sortedTotems.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-500 py-8">
          No answers yet
        </div>
        <div className="flex justify-center">
          <button
            onClick={handleAnswerClickLocal}
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
      {showAddButton && (
        <div className="flex justify-end mb-6">
          <button
            onClick={handleAnswerClickLocal}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            +
          </button>
        </div>
      )}

      {/* Totem Pole Layout */}
      <div className="relative">
        {sortedTotems.map(({ totemName, answers, children }, index) => {
          const answersToShow = [answers[0]];

          return (
            <div key={`${totemName}-${index}-${answers[0]?.answer.id || index}`} className="relative flex items-start gap-2 sm:gap-4 mb-6">
              {/* Number Circle */}
              <div className="flex flex-col items-center relative flex-shrink-0">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold mt-16 relative z-10 ${index === 0 ? 'ring-4 ring-yellow-400' : ''}`}>
                  {index + 1}
                </div>
                {/* Connecting Line */}
                {index < sortedTotems.length - 1 && (
                  <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-0.5 bg-blue-400" style={{ height: 'calc(100% + 2rem)' }}></div>
                )}
              </div>

              {/* Totem Card */}
              <div className="flex-1 min-w-0 bg-white rounded-xl shadow p-3 sm:p-4">
                {/* Totem Name Header — click name to see all answers for this totem */}
                <div className="flex flex-wrap items-center justify-between gap-1 mb-4">
                  <Link
                    href={getTotemUrl(post.id, totemName)}
                    className="text-base sm:text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {totemName}
                  </Link>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-500 flex-shrink-0">
                    <span>{answers.length} {answers.length === 1 ? 'answer' : 'answers'}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(toDate(answers[0]?.answer.createdAt || Date.now()), { addSuffix: true })}</span>
                  </div>
                </div>

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
                          <FormattedText text={truncateAnswerPreview(answerData.answer.text)} disableLinks={true} />
                        </div>
                      </Link>
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="flex items-center space-x-2">
                          {/* Only show the specific totem for this bin */}
                          <TotemButton
                            key={`${answerData.answer.id}-${totemName}`}
                            totemName={totemName}
                            postId={post.id}
                            answerId={answerData.answer.id}
                          />
                          {/* Show other totems count if there are more */}
                          {answerData.answer.totems.length > 1 && (
                            <Link
                              href={getAnswerUrl(post.id, answerData.answer.id)}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              +{answerData.answer.totems.length - 1} more
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                          <span>
                            {formatDistanceToNow(toDate(answerData.answer.createdAt), { addSuffix: true })} by{' '}
                            <Link
                              href={getProfileUrl(answerData.answer.username || answerData.answer.firebaseUid || '')}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {getUserDisplayName(answerData.answer)}
                            </Link>
                          </span>
                          <ReportButton
                            contentId={answerData.answer.id}
                            contentType="answer"
                            parentId={post.id}
                            iconOnly={true}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>


                {/* Nested Totems */}
                {children.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="space-y-2">
                      {children.map((childTotem, childIndex) => (
                        <div key={childTotem.totemName} className="flex items-center space-x-2 text-sm">
                          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                          <span className="text-gray-600">{childTotem.totemName}</span>
                          <span className="text-gray-400">({childTotem.answers.length} answers)</span>
                        </div>
                      ))}
                    </div>
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