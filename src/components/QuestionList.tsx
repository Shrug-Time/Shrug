import { Post } from '@/types/models';
import { formatDistanceToNow } from 'date-fns';
import { TotemButton } from '@/components/totem/TotemButton';
import { getTotemLikes } from '@/utils/componentHelpers';

interface QuestionListProps {
  posts: Post[];
}

export function QuestionList({ posts }: QuestionListProps) {
  // Group posts by totem
  const postsByTotem = posts.reduce((acc, post) => {
    post.answers.forEach(answer => {
      answer.totems.forEach(totem => {
        if (!acc[totem.name]) {
          acc[totem.name] = [];
        }
        acc[totem.name].push({
          post,
          answer,
          totem,
          likes: getTotemLikes(totem)
        });
      });
    });
    return acc;
  }, {} as Record<string, Array<{
    post: Post;
    answer: any;
    totem: any;
    likes: number;
  }>>);

  // Sort posts within each totem by likes
  Object.keys(postsByTotem).forEach(totemName => {
    postsByTotem[totemName].sort((a, b) => b.likes - a.likes);
  });

  return (
    <div className="space-y-8">
      {Object.entries(postsByTotem).map(([totemName, totemPosts]) => (
        <div key={totemName} className="space-y-4">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {totemName}
            </h2>
            <p className="text-gray-600">
              {totemPosts.length} answers
            </p>
          </div>

          {/* Show only the top answer for each totem */}
          {totemPosts[0] && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-600 mb-4">
                {totemPosts[0].answer.text}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TotemButton
                    totemName={totemName}
                    postId={totemPosts[0].post.id}
                  />
                  {totemPosts[0].answer.totems.length > 1 && (
                    <span className="text-sm text-gray-500">
                      +{totemPosts[0].answer.totems.length - 1} more totems
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDistanceToNow(totemPosts[0].post.createdAt, { addSuffix: true })} by {totemPosts[0].answer.username}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 