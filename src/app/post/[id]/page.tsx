"use client";

import { useEffect, useState, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Post } from '@/types/models';
import { TotemButton } from '@/components/common/TotemButton';
import { auth } from '@/firebase';
import { handleTotemLike, handleTotemRefresh } from '@/utils/totem';
import { QuestionList } from '@/components/questions/QuestionList';
import { Header } from '@/components/common/Header';
import { CreatePostForm } from '@/components/posts/CreatePostForm';
import { AnswerModal } from '@/components/answers/AnswerModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser';
import { PostService } from '@/services/firebase';

// Helper function to convert timestamps
function convertTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return obj.toMillis();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertTimestamps(obj[key]);
    }
    return converted;
  }

  return obj;
}

interface GroupedAnswer {
  totemName: string;
  answers: Array<{
    text: string;
    userId: string;
    createdAt: any;
    answerIdx: number;
    likes: number;
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
  const { profile: userData, isLoadingUserData } = useUser();
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.text}</h1>
        <div className="text-sm text-gray-600">
          Posted by {post.username}
        </div>
      </div>

      <QuestionList
        posts={[post]}
        onWantToAnswer={handleWantToAnswer}
        onLikeTotem={async (post, answerIdx, totemName) => {
          // TODO: Implement like functionality
        }}
        onUnlikeTotem={async (post, answerIdx, totemName) => {
          // TODO: Implement unlike functionality
        }}
        currentUserId={userData?.firebaseUid || null}
        hasNextPage={false}
        isLoading={isLoading}
        onLoadMore={() => {}}
        showAllTotems={true}
      />

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