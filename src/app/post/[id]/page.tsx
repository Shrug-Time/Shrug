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

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [refreshCount, setRefreshCount] = useState(5);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "posts", resolvedParams.id),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setPost(convertTimestamps({
            id: doc.id,
            ...data
          }) as Post);
        } else {
          router.push('/');
        }
      },
      (error) => {
        console.error("Error fetching post:", error);
        router.push('/');
      }
    );

    return () => unsubscribe();
  }, [resolvedParams.id, router]);

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

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{post.question}</h1>
              <p className="text-gray-600 mt-1">
                {post.answers.length} {post.answers.length === 1 ? 'answer' : 'answers'} • Posted {formatDistanceToNow(post.createdAt, { addSuffix: true })} by {post.userName || 'Anonymous'}
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-blue-500 hover:underline"
            >
              Back to Questions
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-lg font-semibold mb-4">All Answers</h2>
            <QuestionList
              posts={[post]}
              onSelectQuestion={() => {}}
              onLikeTotem={(_post, answerIdx, totemName) => onLikeTotem(answerIdx, totemName)}
              onRefreshTotem={(_post, answerIdx, totemName) => onRefreshTotem(answerIdx, totemName)}
              showAllTotems={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
} 