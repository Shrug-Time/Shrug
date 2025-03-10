import { useState, useEffect } from 'react';
import { doc, updateDoc, setDoc, getDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post, Answer, UserProfile } from '@/types/models';

interface AnswerFormProps {
  selectedQuestion: Post;
  userId: string;
  isVerified: boolean;
  onAnswerSubmitted: () => void;
}

export function AnswerForm({
  selectedQuestion,
  userId,
  isVerified,
  onAnswerSubmitted
}: AnswerFormProps) {
  const [answer, setAnswer] = useState("");
  const [totems, setTotems] = useState<string[]>([]);
  const [customTotem, setCustomTotem] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    };
    fetchUserProfile();
  }, [userId]);

  const handlePostAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer || !isVerified || !userProfile) {
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
        likeTimes: [],
        likeValues: []
      })),
      userId,
      userName: userProfile.name,
      userID: userProfile.userID,
      createdAt: Timestamp.now(),
    };

    const updatedAnswers = [newAnswer, ...selectedQuestion.answers];
    const postRef = doc(db, "posts", selectedQuestion.id);
    await updateDoc(postRef, {
      answers: updatedAnswers,
      ...(selectedQuestion.createdAt ? {} : { createdAt: Timestamp.now() }),
    });

    const answerId = `${selectedQuestion.id}-${updatedAnswers.length - 1}`;
    const userAnswer = {
      postId: selectedQuestion.id,
      answerIdx: 0,
      text: answer,
      totems,
      createdAt: Timestamp.now(),
    };

    try {
      await setDoc(doc(db, "users", userId, "answers", answerId), userAnswer);

      for (const totemName of totems) {
        const totemRef = doc(db, "totems", totemName);
        const totemSnap = await getDoc(totemRef);
        if (totemSnap.exists()) {
          await updateDoc(totemRef, {
            answerRefs: arrayUnion({
              userId,
              postId: selectedQuestion.id,
              answerId,
            }),
            usageCount: increment(1),
            lastUsed: Timestamp.now(),
          });
        } else {
          await setDoc(totemRef, {
            name: totemName,
            answerRefs: [{ userId, postId: selectedQuestion.id, answerId }],
            usageCount: 1,
            lastUsed: Timestamp.now(),
          });
        }
      }

      setAnswer("");
      setTotems([]);
      setCustomTotem("");
      onAnswerSubmitted();
    } catch (error) {
      console.error("Error posting answer:", error);
      alert("Failed to post answer. Please try again.");
    }
  };

  const handleTotemSelect = (totem: string) => {
    setTotems((prev) => (prev.includes(totem) ? prev.filter((t) => t !== totem) : [...prev, totem]));
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">{selectedQuestion.question}</h2>
      <form onSubmit={handlePostAnswer} className="space-y-4">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          className="w-full p-4 border rounded-xl resize-none"
          rows={4}
          disabled={!isVerified}
        />
        <div className="space-y-2">
          <input
            type="text"
            value={customTotem}
            onChange={(e) => setCustomTotem(e.target.value)}
            placeholder="Add a totem (e.g., All-Natural, Name Brand)"
            className="w-full p-3 border rounded-xl"
          />
          <button
            type="button"
            onClick={() => {
              if (customTotem.trim()) {
                handleTotemSelect(customTotem.trim());
                setCustomTotem("");
              }
            }}
            className="w-full p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
          >
            Add Totem
          </button>
        </div>
        {totems.length > 0 && (
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">Selected Totems:</p>
            <div className="flex flex-wrap gap-2">
              {totems.map((totem) => (
                <span
                  key={totem}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center"
                >
                  {totem}
                  <button
                    type="button"
                    onClick={() => handleTotemSelect(totem)}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
            disabled={!isVerified || !answer.trim()}
          >
            Post Answer
          </button>
          <button
            type="button"
            onClick={onAnswerSubmitted}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 