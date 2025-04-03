import { Post, Answer, Totem } from '@/types/models';
import { formatDistanceToNow } from 'date-fns';
import { TotemButton } from '@/components/totem/TotemButtonV2';
import { getTotemLikes, getUserDisplayName } from '@/utils/componentHelpers';
import { useRouter } from 'next/navigation';

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
      <div className="text-center text-gray-500 py-8">
        No answers yet
      </div>
    );
  }

  return (
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
              <div className="text-gray-600 mb-4">
                {answers[0].answer.text}
              </div>
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
                <div className="text-sm text-gray-500">
                  {formatDistanceToNow(toDate(post.createdAt), { addSuffix: true })} by {getUserDisplayName(answers[0].answer)}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 