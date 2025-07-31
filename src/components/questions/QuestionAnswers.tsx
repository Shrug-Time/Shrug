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

  // Group answers by totem
  const answersByTotem = post.answers.reduce((acc, answer) => {
    answer.totems.forEach(totem => {
      const normalizedName = totem.name.toLowerCase();
      if (!acc[normalizedName]) {
        acc[normalizedName] = [];
      }
      acc[normalizedName].push({
        answer,
        totem,
        likes: getTotemLikes(totem)
      });
    });
    return acc;
  }, {} as Record<string, Array<{
    answer: Answer;
    totem: Totem;
    likes: number;
  }>>);

  // Sort answers within each totem by likes
  Object.keys(answersByTotem).forEach(totemName => {
    answersByTotem[totemName].sort((a, b) => b.likes - a.likes);
  });

  // Calculate total likes for each totem and sort totems by total likes
  const sortedTotems = Object.entries(answersByTotem)
    .map(([totemName, answers]) => ({
      totemName,
      answers,
      totalLikes: answers.reduce((sum, { likes }) => sum + likes, 0)
    }))
    .sort((a, b) => b.totalLikes - a.totalLikes);

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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TotemButton
                            totemName={totemName}
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
                            parentId={post.id}
                          />
                        </div>
                      </div>
                      {/* Separator for multiple answers */}
                      {isExpanded && answerIndex < answersToShow.length - 1 && (
                        <div className="border-t border-gray-100 mt-4"></div>
                      )}
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