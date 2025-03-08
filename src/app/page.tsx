// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db, checkOrCreateUser } from "@/firebase";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, addDoc, onSnapshot, updateDoc, doc, Timestamp, getDocs, QuerySnapshot, DocumentData, setDoc, getDoc, arrayUnion, increment } from "firebase/firestore";
import { QuestionList } from '@/components/questions/QuestionList';
import { Header } from '@/components/common/Header';
import { AnswerForm } from '@/components/answers/AnswerForm';
import type { Post } from '@/types/models';
import { handleTotemLike, handleTotemRefresh } from '@/utils/totem';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);
  const [refreshCount, setRefreshCount] = useState(5);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const data = await checkOrCreateUser(user);
        setUserData(data);
      } else {
        router.push("/login");
      }
    });

    let unsubscribePosts: () => void;

    if (user) {
      unsubscribePosts = onSnapshot(collection(db, "posts"), (snapshot) => {
        const postsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];
        const updatedPosts = postsList.map((post) => {
          const answers = Array.isArray(post.answers) ? post.answers : [];
          post.answers = answers.map((answer) => {
            const totems = Array.isArray(answer.totems) ? answer.totems : [];
            answer.totems = totems.map((totem) => {
              if (!totem.lastLike) totem.lastLike = null;
              if (!totem.likedBy) totem.likedBy = [];
              if (totem.lastLike) {
                const now = new Date();
                const lastLikeDate = new Date(totem.lastLike);
                const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
                const timeSinceLike = now.getTime() - lastLikeDate.getTime();
                totem.crispness = timeSinceLike <= ONE_WEEK_MS
                  ? Math.max(0, Math.min(100, 100 * (1 - timeSinceLike / ONE_WEEK_MS)))
                  : 0;
              } else {
                totem.crispness = 0;
              }
              return totem;
            });
            return answer;
          });
          return post;
        });
        setPosts(updatedPosts);
      }, (error) => {
        console.error("Error in snapshot listener:", error);
        if (error.code === "permission-denied") setPosts([]);
      });
    } else {
      setPosts([]);
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribePosts) unsubscribePosts();
    };
  }, [user, router]);

  const handleTotemLikeClick = async (postId: string, answerIdx: number, totemName: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      await handleTotemLike(post, answerIdx, totemName, user.uid);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleTotemRefreshClick = async (postId: string, answerIdx: number, totemName: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

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

  const handleLogout = () => {
    auth.signOut();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        refreshCount={refreshCount}
        isVerified={userData?.verified ?? false}
        onLogout={handleLogout}
      />

      <main className="max-w-4xl mx-auto p-6">
        {selectedQuestion ? (
          <AnswerForm
            selectedQuestion={selectedQuestion}
            userId={user.uid}
            isVerified={userData?.verified ?? false}
            onAnswerSubmitted={() => setSelectedQuestion(null)}
          />
        ) : (
          <QuestionList
            posts={posts}
            onSelectQuestion={setSelectedQuestion}
            onLikeTotem={handleTotemLikeClick}
            onRefreshTotem={handleTotemRefreshClick}
          />
        )}
      </main>
    </div>
  );
}