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
  const [isDev] = useState(process.env.NODE_ENV === 'development');

  // Debug log for props
  useEffect(() => {
    console.log('AnswerForm props:', {
      selectedQuestion,
      userId,
      isVerified
    });
  }, [selectedQuestion, userId, isVerified]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          console.log('Fetched user profile:', userData);
          setUserProfile(userData);
        } else {
          console.error('User document does not exist');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchUserProfile();
  }, [userId]);

  if (!selectedQuestion || !selectedQuestion.question) {
    console.warn('Invalid selectedQuestion:', selectedQuestion);
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-gray-600">Loading question...</p>
      </div>
    );
  }

  const handlePostAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting answer with data:', {
      answer,
      totems,
      selectedQuestion,
      userProfile
    });
    
    // Comprehensive validation
    if (!answer.trim()) {
      alert("Please enter an answer before submitting.");
      return;
    }

    if (!userProfile) {
      console.error("User profile not loaded");
      alert("Please wait for your profile to load and try again.");
      return;
    }

    if (!selectedQuestion?.id) {
      console.error("Invalid question:", selectedQuestion);
      alert("Invalid question. Please try again.");
      return;
    }

    // Validate totems array
    const validTotems = totems.filter(t => t && typeof t === 'string');
    if (validTotems.length !== totems.length) {
      console.error("Invalid totems found:", totems);
      alert("Some totems are invalid. Please try again.");
      return;
    }

    try {
      // Log the current state before updates
      console.log('Current question state:', {
        id: selectedQuestion.id,
        answers: selectedQuestion.answers,
        createdAt: selectedQuestion.createdAt
      });

      // Create new answer with explicit null checks
      const newAnswer: Answer = {
        text: answer.trim(),
        totems: validTotems.map((t) => ({
          name: t,
          likes: 0,
          lastLike: '',  // Empty string instead of null/undefined
          likedBy: [],
          likeTimes: [],
          likeValues: [],
          crispness: 0,
          category: { id: '', name: '', description: '', children: [], usageCount: 0 },
          decayModel: 'MEDIUM',
          usageCount: 0,
          relatedTotems: []
        })),
        userId,
        userName: userProfile.name || 'Anonymous',
        createdAt: Timestamp.now(),
        isVerified: isDev || isVerified,
        isPremium: userProfile.membershipTier === 'premium'
      };

      // Ensure we have valid arrays and timestamps
      const updatedAnswers = Array.isArray(selectedQuestion.answers) 
        ? [newAnswer, ...selectedQuestion.answers] 
        : [newAnswer];

      // Create update data with proper type
      const updateData: Partial<Post> = {
        answers: updatedAnswers,
        lastEngagement: Timestamp.now().toDate().toISOString(),
      };

      // Add createdAt only if it doesn't exist
      if (!selectedQuestion.createdAt) {
        updateData.createdAt = Timestamp.now().toDate().toISOString();
      }

      console.log('Update data to be sent:', updateData);

      // Validate update data before sending to Firebase
      if (!updateData.answers || !Array.isArray(updateData.answers)) {
        throw new Error('Invalid answers array');
      }

      const postRef = doc(db, "posts", selectedQuestion.id);
      await updateDoc(postRef, updateData);

      const answerId = `${selectedQuestion.id}-${updatedAnswers.length - 1}`;
      const userAnswer = {
        postId: selectedQuestion.id,
        answerIdx: 0,
        text: answer.trim(),
        totems: totems.filter(t => t && typeof t === 'string'),
        createdAt: Timestamp.now()
      };

      await setDoc(doc(db, "users", userId, "answers", answerId), userAnswer);

      for (const totemName of totems) {
        if (!totemName || typeof totemName !== 'string') continue;
        
        const totemRef = doc(db, "totems", totemName);
        const totemSnap = await getDoc(totemRef);
        if (totemSnap.exists()) {
          await updateDoc(totemRef, {
            answerRefs: arrayUnion({
              userId,
              postId: selectedQuestion.id,
              answerId
            }),
            usageCount: increment(1),
            lastUsed: Timestamp.now()
          });
        } else {
          await setDoc(totemRef, {
            name: totemName,
            answerRefs: [{ userId, postId: selectedQuestion.id, answerId }],
            usageCount: 1,
            lastUsed: Timestamp.now()
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
    if (!totem || typeof totem !== 'string') {
      console.error('Invalid totem value:', totem);
      return;
    }
    
    setTotems((prev) => {
      if (prev.includes(totem)) {
        return prev.filter((t) => t !== totem);
      }
      return [...prev, totem];
    });
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      {isDev && (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
          Development Mode: Email verification bypassed
        </div>
      )}
      <h2 className="text-xl font-bold mb-4">{selectedQuestion.question}</h2>
      <form onSubmit={handlePostAnswer} className="space-y-4">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          className="w-full p-4 border rounded-xl resize-none"
          rows={4}
          disabled={!isDev && !isVerified}
        />
        <div className="space-y-2">
          <input
            type="text"
            value={customTotem}
            onChange={(e) => setCustomTotem(e.target.value)}
            placeholder="Add a totem (e.g., All-Natural, Name Brand)"
            className="w-full p-3 border rounded-xl"
            disabled={!isDev && !isVerified}
          />
          <button
            type="button"
            onClick={() => {
              const trimmedTotem = customTotem.trim();
              if (trimmedTotem) {
                handleTotemSelect(trimmedTotem);
                setCustomTotem("");
              }
            }}
            className="w-full p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
            disabled={!isDev && !isVerified}
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
            disabled={(!isDev && !isVerified) || !answer.trim()}
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