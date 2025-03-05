"use client";

import { useState, useEffect } from "react";
import { auth, db, checkOrCreateUser } from "../firebase";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, addDoc, onSnapshot, updateDoc, doc, serverTimestamp, FieldValue } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

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
  createdAt?: any; // Firestore Timestamp
}

interface Post {
  id: string;
  question: string;
  answers: Answer[];
  userId: string;
  createdAt?: any; // Firestore Timestamp
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
      createdAt: serverTimestamp(), // Works for top-level fields
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
    await updateDoc(doc(db, "posts", selectedQuestion.id), {
      answers: updatedAnswers,
      // Add or update post's createdAt if not present (for new posts)
      ...(selectedQuestion.createdAt ? {} : { createdAt: serverTimestamp() }),
    });
    setAnswer("");
    setTotems([]);
    setCustomTotem("");
    setSelectedQuestion(null);
  };

  const handleTotemLike = async (postId: string, answerIdx: number, totemName: string) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId) as Post;
    const totem = post.answers[answerIdx].totems.find((t) => t.name === totemName);
    if (!totem || totem.likedBy?.includes(user.uid)) return;

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
              t.name === totemName
                ? {
                    ...t,
                    lastLike: new Date().toISOString(), // Reset for all likes
                    likedBy: t.likedBy, // Keep all users
                  }
                : t
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
        await sendEmailVerification(user);
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

  const getTopTotem = (totems: Totem[]): Totem | null => {
    if (!totems.length) return null;
    return totems.reduce((top, current) => (current.likes > top.likes ? current : top));
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="flex justify-between items-center p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-500">Shrug</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-red-500 text-red-500 rounded-full hover:bg-red-500 hover:text-white"
        >
          Log Out
        </button>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <p className="text-gray-500 mb-2">Refreshes Left: {refreshCount}</p>
          <p>
            Verification Status: {userData?.verified ? "Verified" : "Not Verified"}
            {!userData?.verified && (
              <button
                onClick={handleVerifyEmail}
                className="ml-2 px-4 py-2 border border-blue-500 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white"
              >
                Verify Email
              </button>
            )}
          </p>
          <form onSubmit={handlePostQuestion} className="mt-4 space-y-4">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full p-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500"
            />
            <button
              type="submit"
              className="w-full p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600"
            >
              Ask
            </button>
          </form>
        </div>
        {posts.map((post) => (
          <div key={post.id} className="mb-6 p-4 bg-white rounded-xl shadow">
            <h2 className="text-xl font-bold mb-2">{post.question}</h2>
            {post.answers.map((ans: Answer, aIdx: number) => (
              <div key={aIdx} className="mt-2 flex flex-col">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-gray-700">
                      {ans.userId} • {ans.createdAt ? formatDistanceToNow(new Date(ans.createdAt.toDate()), { addSuffix: true }) : "Just now"}
                      <br />
                      {ans.text} <a href="#" className="text-blue-500 hover:underline">Show More</a>
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col items-end">
                    {getTopTotem(ans.totems) && (
                      <button
                        key={getTopTotem(ans.totems)!.name}
                        onClick={() => handleTotemLike(post.id, aIdx, getTopTotem(ans.totems)!.name)}
                        className="mb-2 px-4 py-2 w-[120px] h-[40px] rounded-full text-white hover:opacity-90 text-sm font-medium shadow-md"
                        style={{
                          backgroundColor:
                            getTopTotem(ans.totems)!.name === "All-Natural" ? "#4CAF50" :
                            getTopTotem(ans.totems)!.name === "Name Brand" ? "#9C27B0" :
                            getTopTotem(ans.totems)!.name === "Chicken-Based" ? "#FFCA28" : "#808080",
                        }}
                      >
                        {getTopTotem(ans.totems)!.name} ({getTopTotem(ans.totems)!.likes})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => setSelectedQuestion(post)}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
            >
              Write Answer
            </button>
            {selectedQuestion?.id === post.id && (
              <div className="mt-4 space-y-4">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Your answer..."
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500"
                />
                <input
                  type="text"
                  value={customTotem}
                  onChange={handleCustomTotem}
                  placeholder="Totem (e.g., All-Natural, Name Brand)"
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500"
                />
                <button
                  onClick={() => handleTotemSelect(customTotem)}
                  className="w-full p-3 border border-gray-300 text-gray-900 rounded-full hover:bg-gray-200"
                >
                  Add Totem
                </button>
                <p className="text-gray-500">Selected Totems: {totems.join(", ") || "None"}</p>
                <button
                  onClick={handlePostAnswer}
                  className="w-full p-3 bg-green-500 text-white rounded-full hover:bg-green-600"
                >
                  Post Answer
                </button>
              </div>
            )}
            {post.answers.length > 3 && (
              <p className="mt-2 text-blue-500 hover:underline cursor-pointer">See More Answers</p>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}