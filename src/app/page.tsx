"use client";

import { useState, useEffect } from "react";
import { auth, db, checkOrCreateUser } from "../firebase";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth"; // Add sendEmailVerification
import { useRouter } from "next/navigation";
import { collection, addDoc, onSnapshot, updateDoc, doc } from "firebase/firestore";

// Simple types for your data
interface Totem {
  name: string;
  likes: number;
  lastLike?: string | null;
  likedBy?: string[];
  crispness?: number;
}

interface Answer {
  text: string;
  totems: Totem[];
  userId: string;
}

interface Post {
  id: string;
  question: string;
  answers: Answer[];
  userId: string;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [totems, setTotems] = useState<string[]>([]);
  const [customTotem, setCustomTotem] = useState("");
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

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !user || !userData?.verified) {
      alert("Please verify your email before posting questions!");
      return;
    }
    await addDoc(collection(db, "posts"), {
      question,
      answers: [],
      userId: user.uid,
    });
    setQuestion("");
  };

  const handlePostAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer || !selectedQuestion || !user || !userData?.verified) {
      alert("Please verify your email before posting answers!");
      return;
    }
    const newAnswer: Answer = {
      text: answer,
      totems: totems.map((t) => ({
        name: t,
        likes: 0,
        lastLike: null,
        likedBy: [],
      })),
      userId: user.uid,
    };
    const updatedAnswers = [newAnswer, ...selectedQuestion.answers];
    await updateDoc(doc(db, "posts", selectedQuestion.id), { answers: updatedAnswers });
    setAnswer("");
    setTotems([]);
    setCustomTotem("");
    setSelectedQuestion(null);
  };

  const handleTotemLike = async (postId: string, answerIdx: number, totemName: string) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId) as Post;
    const totem = post.answers[answerIdx].totems.find((t) => t.name === totemName);
    if (!totem || totem.likedBy?.includes(user.uid)) return; // Check totem exists

    const updatedAnswers = post.answers.map((ans, idx) =>
      idx === answerIdx
        ? {
            ...ans,
            totems: ans.totems.map((t) =>
              t.name === totemName
                ? {
                    ...t,
                    likes: t.likes + 1,
                    lastLike: new Date().toISOString(),
                    likedBy: t.likedBy ? [...t.likedBy, user.uid] : [user.uid],
                  }
                : t
            ),
          }
        : ans
    );
    await updateDoc(doc(db, "posts", postId), { answers: updatedAnswers });
  };

  const handleTotemSelect = (totem: string) => {
    setTotems((prev) => (prev.includes(totem) ? prev.filter((t) => t !== totem) : [...prev, totem]));
  };

  const handleCustomTotem = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTotem(e.target.value);
  };

  const handleRefreshCrispness = async (postId: string, answerIdx: number, totemName: string) => {
    if (!user || refreshCount <= 0) {
      alert("No refreshes left today. Upgrade to Premium for more!");
      return;
    }
    const post = posts.find((p) => p.id === postId) as Post;
    const updatedAnswers = post.answers.map((ans, idx) =>
      idx === answerIdx
        ? {
            ...ans,
            totems: ans.totems.map((t) =>
              t.name === totemName ? { ...t, lastLike: new Date().toISOString() } : t
            ),
          }
        : ans
    );
    await updateDoc(doc(db, "posts", postId), { answers: updatedAnswers });
    setRefreshCount((prev) => prev - 1);
  };

  const handleVerifyEmail = async () => {
    if (user && !userData?.verified) {
      try {
        await sendEmailVerification(user); // Now imported
        alert("Verification email sent! Please check your inbox.");
      } catch (error: any) {
        alert("Error sending verification: " + error.message);
      }
    }
  };

  const handleLogout = () => {
    auth.signOut();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">Shrug</h1>
      <div className="mb-6">
        <p className="text-gray-600 mb-2">Refreshes Left: {refreshCount}</p>
        <p>
          Verification Status: {userData?.verified ? "Verified" : "Not Verified"}
          {!userData?.verified && (
            <button
              onClick={handleVerifyEmail}
              className="bg-blue-500 text-white p-2 rounded ml-2 hover:bg-blue-600"
            >
              Verify Email
            </button>
          )}
        </p>
        <form onSubmit={handlePostQuestion} className="space-y-4 mb-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full p-2 border rounded text-gray-900"
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Ask
          </button>
        </form>
        {posts.map((post) => (
          <div key={post.id} className="mb-6 p-4 bg-gray-50 rounded shadow">
            <h2 className="text-xl font-bold mb-2 text-gray-900">{post.question}</h2>
            {post.answers.map((ans: Answer, aIdx: number) => (
              <div key={aIdx} className="mt-2">
                <p className="text-gray-900">{ans.text}</p>
                <div className="mt-2 flex flex-wrap">
                  {ans.totems.map((t: Totem) => (
                    <div key={t.name} className="mr-2 mb-2">
                      <button
                        onClick={() => handleTotemLike(post.id, aIdx, t.name)}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-900"
                      >
                        {t.name} ({t.likes}) - Crispness: {Math.round(t.crispness || 0)}%
                      </button>
                      <button
                        onClick={() => handleRefreshCrispness(post.id, aIdx, t.name)}
                        className="bg-yellow-500 text-white p-1 rounded hover:bg-yellow-600 text-xs"
                        disabled={refreshCount <= 0}
                      >
                        Refresh
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setSelectedQuestion(post)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-2"
            >
              Answer
            </button>
            {selectedQuestion?.id === post.id && (
              <div className="mt-4">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Your answer..."
                  className="w-full p-2 border rounded mb-2 text-gray-900"
                />
                <input
                  type="text"
                  value={customTotem}
                  onChange={handleCustomTotem}
                  placeholder="Totem (e.g., Cool, Funny)"
                  className="w-full p-2 border rounded mb-2 text-gray-900"
                />
                <button
                  onClick={() => handleTotemSelect(customTotem)}
                  className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 mb-2"
                >
                  Add Totem
                </button>
                <p className="text-gray-600">Selected Totems: {totems.join(", ") || "None"}</p>
                <button
                  onClick={handlePostAnswer}
                  className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                >
                  Post Answer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}