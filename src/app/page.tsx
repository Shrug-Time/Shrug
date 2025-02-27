"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";

// Define types for Firestore data
interface Totem {
  name: string;
  likes: number;
}

interface Answer {
  text: string;
  totems: Totem[];
  timestamp: any; // Use Date or Firebase Timestamp type if needed
  userId: string;
}

interface Post {
  id: string;
  question: string;
  answers: Answer[];
  timestamp: any; // Use Date or Firebase Timestamp type if needed
  userId: string;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [totems, setTotems] = useState<string[]>([]);
  const [customTotem, setCustomTotem] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Post | null>(null);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUser(user));
    const unsubscribe = onSnapshot(collection(db, "posts"), (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(fetchedPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError(null);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !user) return;
    await addDoc(collection(db, "posts"), {
      question,
      answers: [],
      timestamp: serverTimestamp(),
      userId: user.uid,
    });
    setQuestion("");
  };

  const handlePostAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer || !selectedQuestion) return;
    const newAnswer: Answer = {
      text: answer,
      totems: totems.map((t) => ({ name: t, likes: 0 })),
      timestamp: serverTimestamp(),
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
    const post = posts.find((p) => p.id === postId) as Post;
    const updatedAnswers = post.answers.map((ans: Answer, idx: number) =>
      idx === answerIdx
        ? {
            ...ans,
            totems: ans.totems.map((t: Totem) =>
              t.name === totemName ? { ...t, likes: t.likes + 1 } : t
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

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">Login to Shrug</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 border rounded text-gray-900"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 border rounded text-gray-900"
          />
          {error && <p className="text-red-500">{error}</p>}
          <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Login
          </button>
        </form>
        <p className="mt-4 text-gray-600">
          No account? Create one in Firebase Console and use test@example.com / test1234 for testing.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">Shrug</h1>
      <div className="mb-6">
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
            <button
              onClick={() => setSelectedQuestion(post)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-2"
            >
              Write Answer
            </button>
            {post.answers.map((ans: Answer, aIdx: number) => (
              <div key={aIdx} className="mt-2">
                <p className="text-gray-900">{ans.text}</p>
                <div className="mt-2 flex flex-wrap">
                  {ans.totems.map((t: Totem) => (
                    <button
                      key={t.name}
                      onClick={() => handleTotemLike(post.id, aIdx, t.name)}
                      className="mr-2 mb-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-900"
                    >
                      {t.name} ({t.likes})
                    </button>
                  ))}
                </div>
              </div>
            ))}
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
                  placeholder="Totem"
                  className="w-full p-2 border rounded mb-2 text-gray-900"
                />
                <button
                  onClick={() => handleTotemSelect(customTotem)}
                  className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 mb-2"
                >
                  Add Totem
                </button>
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