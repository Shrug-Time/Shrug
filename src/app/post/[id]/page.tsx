"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
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
import { AnswerForm } from '@/components/answers/AnswerForm';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser';

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

export default function PostPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [refreshCount, setRefreshCount] = useState(5);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { profile: userData, isLoading: isLoadingUserData } = useUser();

  useEffect(() => {
    if (!resolvedParams.id) return;

    const postRef = doc(db, 'posts', resolvedParams.id);
    const unsubscribe = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        const postData = convertTimestamps(doc.data());
        setPost(postData as Post);
      }
    });

    return () => unsubscribe();
  }, [resolvedParams.id]);

  const calculateCrispness = (likes: number[], timestamps: string[]) => {
    if (!likes.length || !timestamps.length) return 0;

    const now = new Date().getTime();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    
    // Calculate weighted average based on time decay
    let totalWeight = 0;
    let weightedSum = 0;

    timestamps.forEach((timestamp, index) => {
      const likeTime = new Date(timestamp).getTime();
      const timeSinceLike = now - likeTime;
      const weight = Math.max(0, 1 - (timeSinceLike / ONE_WEEK_MS));
      
      weightedSum += weight * likes[index];
      totalWeight += weight;
    });

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  };

  const onLikeTotem = async (answerIdx: number, totemName: string) => {
    if (!post || !auth.currentUser) return;
    
    try {
      await handleTotemLike(post, answerIdx, totemName, auth.currentUser.uid);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const onRefreshTotem = async (answerIdx: number, totemName: string) => {
    if (!post || !auth.currentUser) return;
    
    try {
      const updatedAnswers = await handleTotemRefresh(post, answerIdx, totemName, refreshCount);
      if (updatedAnswers) {
        setRefreshCount(prev => prev - 1);
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleWantToAnswer = () => {
    setShowCreatePost(true);
  };

  const handleTotemLikeClick = async (post: Post, answerIdx: number, totemName: string) => {
    await onLikeTotem(answerIdx, totemName);
  };

  const handleTotemUnlikeClick = async (post: Post, answerIdx: number, totemName: string) => {
    // Implement unlike logic
  };

  const handleAnswerSubmitted = () => {
    setSelectedQuestion(null);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        refreshCount={refreshCount}
        isVerified={userData?.verificationStatus === 'email_verified' || userData?.verificationStatus === 'identity_verified'}
        onLogout={() => auth.signOut()}
        isAuthenticated={!!userData}
      />
      
      <main className="container mx-auto px-4 py-8">
        <QuestionList
          posts={[post]}
          onWantToAnswer={handleWantToAnswer}
          onLikeTotem={handleTotemLikeClick}
          onUnlikeTotem={handleTotemUnlikeClick}
          currentUserId={userData?.firebaseUid || null}
          hasNextPage={false}
          isLoading={isLoading}
          onLoadMore={() => {}}
          showAllTotems={true}
        />

        {showCreatePost && userData && (
          <CreatePostForm
            firebaseUid={userData.firebaseUid}
            username={userData.username}
            name={userData.name}
            onPostCreated={() => {
              setShowCreatePost(false);
              queryClient.invalidateQueries({ queryKey: ['posts'] });
            }}
            onCancel={() => setShowCreatePost(false)}
          />
        )}

        {selectedQuestion && userData ? (
          <AnswerForm
            selectedQuestion={selectedQuestion}
            onAnswerSubmitted={handleAnswerSubmitted}
          />
        ) : selectedQuestion ? (
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-gray-600 mb-4">Please log in to answer questions</p>
            <button
              onClick={() => setSelectedQuestion(null)}
              className="px-4 py-2 text-blue-600 hover:text-blue-700"
            >
              Back to Questions
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
} 