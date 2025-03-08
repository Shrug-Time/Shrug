import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Post } from '@/types/models';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TotemButton } from '@/components/common/TotemButton';
import { auth } from '@/firebase';

interface QuestionListProps {
  posts: Post[];
  onSelectQuestion: (post: Post) => void;
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
  const router = useRouter();

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

  const navigateToPost = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  const handleTotemLike = (e: React.MouseEvent, postId: string, answerIdx: number, totemName: string) => {
    e.stopPropagation();
    if (!auth.currentUser) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const totem = post.answers[answerIdx].totems.find(t => t.name === totemName);
    if (!totem) return;

    if (totem.likedBy.includes(auth.currentUser.uid)) {
      alert("You've already liked this totem!");
      return;
    }

    onLikeTotem(postId, answerIdx, totemName);
  };

  const handleTotemRefresh = (e: React.MouseEvent, postId: string, answerIdx: number, totemName: string) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    onRefreshTotem(postId, answerIdx, totemName);
  };

  return (
    <div className="space-y-6">
      {posts.map((post) => {
        const topAnswer = post.answers[0];
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
                {topTotem && (
                  <div className="ml-4" onClick={() => navigateToPost(post.id)}>
                    <TotemButton
                      name={topTotem.name}
                      likes={topTotem.likes}
                      crispness={topTotem.crispness}
                      onLike={(e) => handleTotemLike(e, post.id, 0, topTotem.name)}
                      onRefresh={(e) => handleTotemRefresh(e, post.id, 0, topTotem.name)}
                    />
                  </div>
                )}
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
                <button 
                  onClick={() => navigateToPost(post.id)}
                  className="text-blue-500 hover:underline"
                >
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