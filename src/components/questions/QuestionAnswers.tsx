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
import { getAnswerUrl, getPostUrl } from '@/utils/routes';
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

  // Group answers by totem
  const answersByTotem = post.answers.reduce((acc, answer) => {
    answer.totems.forEach(totem => {
      if (!acc[totem.name]) {
        acc[totem.name] = [];
      }
      acc[totem.name].push({
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
      <div className="flex justify-end mb-4">
        <button
          onClick={handleAnswerClick}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          +
        </button>
      </div>

      <div className="space-y-8">
        {sortedTotems.map(({ totemName, answers, totalLikes }) => (
          <div key={totemName} className="space-y-4">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {totemName}
              </h2>
              <p className="text-gray-600">
                {answers.length} answers • {totalLikes} total likes
              </p>
            </div>

            {/* Show only the top answer for this totem */}
            {answers[0] && (
              <div className="bg-white rounded-xl shadow p-4">
                <Link 
                  className="group cursor-pointer"
                  href={getAnswerUrl(post.id, answers[0].answer.id)}
                  title="View full answer"
                >
                  {answers[0].answer.text}
                </Link>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TotemButton
                      totemName={totemName}
                      postId={post.id}
                    />
                    {answers[0].answer.totems.length > 1 && (
                      <span className="text-sm text-gray-500">
                        +{answers[0].answer.totems.length - 1} more totems
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(toDate(answers[0].answer.createdAt), { addSuffix: true })} by {getUserDisplayName(answers[0].answer)}
                    </div>
                    <ReportButton 
                      contentId={answers[0].answer.id} 
                      contentType="answer" 
                      iconOnly={true}
                      parentId={post.id}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
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