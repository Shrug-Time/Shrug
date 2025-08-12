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
        const crispness = getCrispness(post.id, totem.name, answer.id) || totem.crispness || 0;
        
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

    // Create simple totem structure - each totem is independent
    const totemMap = new Map<string, {
      totemName: string;
      answers: typeof sortedPairs;
      totalLikes: number;
      averageCrispness: number;
      children: Map<string, typeof totemMap>;
    }>();

    // Group totems by name (exact match)
    sortedPairs.forEach(pair => {
      if (!totemMap.has(pair.totem.name)) {
        const totemPairs = sortedPairs
          .filter(p => p.totem.name === pair.totem.name)
          .sort((a, b) => {
            // Ensure individual answers within each totem are sorted by likes first, then crispness
            if (b.likes !== a.likes) {
              return b.likes - a.likes;
            }
            return b.crispness - a.crispness;
          });
        totemMap.set(pair.totem.name, {
          totemName: pair.totem.name,
          answers: totemPairs,
          totalLikes: totemPairs.reduce((sum, { likes }) => sum + likes, 0),
          averageCrispness: totemPairs.length > 0 
            ? totemPairs.reduce((sum, { crispness }) => sum + crispness, 0) / totemPairs.length 
            : 0,
          children: new Map()
        });
      }
    });

    // Second pass: build nested structure
    const result: Array<{
      totemName: string;
      answers: typeof sortedPairs;
      totalLikes: number;
      averageCrispness: number;
      children: Array<typeof result>;
    }> = [];

    // Convert Map to array and sort by total likes
    const sortedTotemEntries = Array.from(totemMap.entries()).sort((a, b) => {
      if (a[1].totalLikes !== b[1].totalLikes) {
        return b[1].totalLikes - a[1].totalLikes;
      }
      return b[1].averageCrispness - a[1].averageCrispness;
    });

    sortedTotemEntries.forEach(([totemName, totemData]) => {
      result.push({
        totemName: totemData.totemName,
        answers: totemData.answers,
        totalLikes: totemData.totalLikes,
        averageCrispness: totemData.averageCrispness,
        children: [] // For now, we'll implement nested totems in the next iteration
      });
    });

    return result;
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
        {sortedTotems.map(({ totemName, answers, children }, index) => {
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
                {/* Totem Name Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{totemName}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{answers.length} answers</span>
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
                          {answerData.answer.text}
                        </div>
                      </Link>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {/* Render all totems for this answer */}
                          {answerData.answer.totems.map((totem, totemIndex) => (
                            <TotemButton 
                              key={`${answerData.answer.id}-${totem.name}-${totemIndex}`}
                              totemName={totem.name}
                              postId={post.id}
                              answerId={answerData.answer.id}
                            />
                          ))}
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