"use client";

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Post, Answer, Totem } from '@/types/models';
import { TotemButton } from '@/components/totem/TotemButtonV2';
import { auth } from '@/firebase';
import { handleTotemLike, handleTotemRefresh } from '@/utils/totem';
import { QuestionList } from '@/components/questions/QuestionList';
import { Header } from '@/components/common/Header';
import { CreatePostForm } from '@/components/posts/CreatePostForm';
import { AnswerModal } from '@/components/answers/AnswerModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser';
import { PostService } from '@/services/firebase';
import { TotemDetail } from '@/components/totem/TotemDetail';
import Link from 'next/link';
import { TotemService } from '@/services/totem';
import { getTotemLikes, getUserDisplayName } from '@/utils/componentHelpers';

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

interface GroupedAnswer {
  totemName: string;
  answers: Array<{
    text: string;
    userId: string;
    createdAt: any;
    answerIdx: number;
    crispness?: number;
    userName: string;
    userID: string;
  }>;
}

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;
  const queryClient = useQueryClient();
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const { profile: userData, isLoading: isLoadingUserData } = useUser();
  const [showCreatePost, setShowCreatePost] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => PostService.getPost(postId),
  });

  const handleWantToAnswer = () => {
    if (post) {
      setSelectedQuestion(post);
    }
  };

  const handleAnswerSubmitted = () => {
    setSelectedQuestion(null);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const getTopTotem = useCallback((answer: Answer) => {
    if (!answer.totems || answer.totems.length === 0) return null;
    return answer.totems.reduce((top, current) => {
      const topLikes = getTotemLikes(top);
      const currentLikes = getTotemLikes(current);
      return currentLikes > topLikes ? current : top;
    }, answer.totems[0]);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.question}</h1>
        <div className="text-sm text-gray-600">
          Posted by {post.username}
        </div>
      </div>

      <div className="space-y-6">
        {post.answers.map((answer, index) => {
          const topTotem = getTopTotem(answer);
          if (!topTotem) return null;

          return (
            <div key={`${post.id}-${answer.text}`} className="bg-white rounded-xl shadow p-6">
              <div className="text-gray-600 mb-4">
                {answer.text}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TotemButton
                    totemName={topTotem.name}
                    postId={post.id}
                  />
                  {answer.totems.length > 1 && (
                    <span className="text-sm text-gray-500">
                      +{answer.totems.length - 1} more totems
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDistanceToNow(toDate(answer.createdAt), { addSuffix: true })} by {getUserDisplayName(answer)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreatePost && userData && (
        <CreatePostForm
          firebaseUid={userData.firebaseUid ?? ''}
          username={userData.username ?? ''}
          name={userData.name ?? ''}
          onPostCreated={() => {
            setShowCreatePost(false);
            queryClient.invalidateQueries({ queryKey: ['posts'] });
          }}
          onCancel={() => setShowCreatePost(false)}
        />
      )}

      {selectedQuestion && (
        <AnswerModal
          isOpen={!!selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          selectedQuestion={selectedQuestion}
          onAnswerSubmitted={handleAnswerSubmitted}
        />
      )}
    </div>
  );
} 