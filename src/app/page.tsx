"use client";

import { useState, useEffect } from "react";
import { auth, db, checkOrCreateUser } from "../firebase";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, addDoc, onSnapshot, updateDoc, doc } from "firebase/firestore";

// Interfaces (Totem, Answer, Post remain unchanged)
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

 return (
 <div className="min-h-screen bg-black text-white">
 <header className="flex justify-between items-center p-6 max-w-4xl mx-auto">
 <h1 className="text-3xl font-bold">Shrug</h1>
 <button
 onClick={handleLogout}
 className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white"
 >
 Log Out
 </button>
 </header>
 <main className="max-w-4xl mx-auto p-6">
 <div className="mb-6">
 <p className="text-gray-400 mb-2">Refreshes Left: {refreshCount}</p>
 <p>
 Verification Status: {userData?.verified ? "Verified" : "Not Verified"}
 {!userData?.verified && (
 <button
 onClick={handleVerifyEmail}
 className="ml-2 px-4 py-2 border border-white rounded hover:bg-white hover:text-black"
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
 className ="w-full p-3 bg-shrug-gray border border-gray-600 rounded text-white placeholder-gray-400"
 />
 <button
 type="submit"
 className="w-full p-3 border border-white rounded hover:bg-white hover:text-black"
 >
 Ask
 </button>
 </form>
 </div>
 {posts.map((post) => (
 <div key={post.id} className="mb-6 p-4 bg-shrug-gray rounded-lg">
 <h2 className="text-xl font-bold mb-2">{post.question}</h2>
 {post.answers.map((ans: Answer, aIdx: number) => (
 <div key={aIdx} className="mt-2">
 <p>{ans.text}</p>
 <div className="mt-2 flex flex-wrap gap-2">
 {ans.totems.map((t: Totem) => (
 <div key={t.name} className="flex items-center gap-1">
 <button
 onClick={() => handleTotemLike(post.id, aIdx, t.name)}
 className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
 >
 {t.name} ({t.likes}) - Crispness: {Math.round(t.crispness || 0)}%
 </button>
 <button
 onClick={() => handleRefreshCrispness(post.id, aIdx, t.name)}
 className="px-2 py-1 bg-yellow-500 text-black rounded hover:bg-yellow-400 text-xs"
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
 className="mt-2 px-4 py-2 border border-white rounded hover:bg-white hover:text-black"
 >
 Answer
 </button>
 {selectedQuestion?.id === post.id && (
 <div className="mt-4 space-y-4">
 <input
 type="text"
 value={answer}
 onChange={(e) => setAnswer(e.target.value)}
 placeholder="Your answer..."
 className="w-full p-3 bg-shrug-gray border border-gray-600 rounded text-white placeholder-gray-400"
 />
 <input
 type="text"
 value={customTotem}
 onChange={handleCustomTotem}
 placeholder="Totem (e.g., Cool, Funny)"
 className="w-full p-3 bg-shrug-gray border border-gray-600 rounded text-white placeholder-gray-400"
 />
 <button
 onClick={() => handleTotemSelect(customTotem)}
 className="w-full p-3 border border-white rounded hover:bg-white hover:text-black"
 >
 Add Totem
 </button>
 <p className="text-gray-400">Selected Totems: {totems.join(", ") || "None"}</p>
 <button
 onClick={handlePostAnswer}
 className="w-full p-3 border border-white rounded hover:bg-white hover:text-black"
 >
 Post Answer
 </button>
 </div>
 )}
 </div>
 ))}
 </main>
 </div>
 );
}