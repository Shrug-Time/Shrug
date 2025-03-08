import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Post } from '@/types/models';
import { useState } from 'react';

interface QuestionListProps {
  posts: Post[];
  onSelectQuestion: (question: Post) => void;
  onLikeTotem: (postId: string, answerIdx: number, totemName: string) => void;
  onRefreshTotem: (postId: string, answerIdx: number, totemName: string) => void;
}

export function QuestionList({ 
  posts, 
  onSelectQuestion, 
  onLikeTotem,
  onRefreshTotem 
}: QuestionListProps) {
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  const getTopTotem = (totems: Post['answers'][0]['totems']) => {
    if (!totems.length) return null;
    return totems.reduce((top, current) => (current.likes > top.likes ? current : top));
  };

  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const truncateText = (text: string) => {
    const firstParagraph = text.split('\n')[0];
    if (firstParagraph.length > 150) {
      return firstParagraph.substring(0, 150) + '...';
    }
    return firstParagraph;
  };

  return (
    <div className="space-y-6">
      {posts.map((post) => {
        const topAnswer = post.answers[0]; // Get only the first answer
        if (!topAnswer) return null;

        const topTotem = getTopTotem(topAnswer.totems);
        const isExpanded = expandedPosts[post.id];
        const displayText = isExpanded ? topAnswer.text : truncateText(topAnswer.text);

        return (
          <div key={post.id} className="bg-white rounded-xl shadow p-4">
            <h2 className="text-xl font-bold mb-2">{post.question}</h2>
            <div className="mt-2 flex flex-col">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-gray-700">
                    {topAnswer.userId} • {topAnswer.createdAt ? 
                      formatDistanceToNow(
                        typeof topAnswer.createdAt === 'number' 
                          ? new Date(topAnswer.createdAt) 
                          : (topAnswer.createdAt as Timestamp).toDate(), 
                        { addSuffix: true }
                      ) : "Just now"}
                    <br />
                    {displayText}
                    {topAnswer.text.length > displayText.length && (
                      <button 
                        onClick={() => togglePostExpansion(post.id)}
                        className="ml-2 text-blue-500 hover:underline"
                      >
                        {isExpanded ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </p>
                </div>
                <div className="ml-4 flex flex-col items-end">
                  {topTotem && (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <button
                          className="px-4 py-2 w-[120px] h-[40px] rounded-l-full text-white hover:opacity-90 text-sm font-medium shadow-md border-r border-white/20"
                          style={{
                            backgroundColor:
                              topTotem.name === "All-Natural" ? "#4CAF50" :
                              topTotem.name === "Name Brand" ? "#9C27B0" :
                              topTotem.name === "Chicken-Based" ? "#FFCA28" : "#808080",
                          }}
                          onClick={() => {/* TODO: Navigate to totem view */}}
                        >
                          {topTotem.name}
                        </button>
                        <button
                          className="px-2 py-2 h-[40px] rounded-r-full text-white hover:opacity-90 text-sm font-medium shadow-md flex items-center"
                          style={{
                            backgroundColor:
                              topTotem.name === "All-Natural" ? "#4CAF50" :
                              topTotem.name === "Name Brand" ? "#9C27B0" :
                              topTotem.name === "Chicken-Based" ? "#FFCA28" : "#808080",
                          }}
                          onClick={() => onLikeTotem(post.id, 0, topTotem.name)}
                        >
                          {topTotem.likes}
                        </button>
                        {topTotem.crispness !== undefined && (
                          <div className="ml-2 text-sm text-gray-600">
                            {Math.round(topTotem.crispness)}% fresh
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onRefreshTotem(post.id, 0, topTotem.name)}
                        className="text-sm text-blue-500 hover:underline"
                      >
                        Refresh Crispness
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => onSelectQuestion(post)}
                className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
              >
                Write Answer
              </button>
              {post.answers.length > 1 && (
                <button className="text-blue-500 hover:underline">
                  See More Totems ({post.answers.length - 1} more)
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 