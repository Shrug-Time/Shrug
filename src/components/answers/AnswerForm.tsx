import { useState, useEffect } from 'react';
import { doc, updateDoc, setDoc, getDoc, arrayUnion, increment, Timestamp, collection, serverTimestamp } from 'firebase/firestore';
import { db, sendVerificationEmail, auth } from '@/firebase';
import type { Post, Answer, UserProfile } from '@/types/models';

// Extend the Answer interface to include the id property
interface ExtendedAnswer extends Answer {
  id: string;
  upvotes: number;
  downvotes: number;
}

interface AnswerFormProps {
  selectedQuestion: Post;
  firebaseUid: string;
  username: string;
  name: string;
  isVerified?: boolean;
  onAnswerSubmitted: () => void;
}

export function AnswerForm({
  selectedQuestion,
  firebaseUid,
  username,
  name,
  isVerified = false,
  onAnswerSubmitted
}: AnswerFormProps) {
  const [answer, setAnswer] = useState("");
  const [totems, setTotems] = useState<string[]>([]);
  const [customTotem, setCustomTotem] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug log for props
  useEffect(() => {
    console.log('AnswerForm props:', {
      selectedQuestion,
      firebaseUid,
      username,
      name,
      isVerified
    });
  }, [selectedQuestion, firebaseUid, username, name, isVerified]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUid));
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
  }, [firebaseUid]);

  if (!selectedQuestion || !selectedQuestion.question) {
    console.warn('Invalid selectedQuestion:', selectedQuestion);
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-gray-600">Loading question...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!answer.trim()) {
      setError('Please enter an answer');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    if (!userProfile) {
      console.error("User profile not loaded");
      alert("Please wait for your profile to load and try again.");
      setIsSubmitting(false);
      return;
    }

    if (!selectedQuestion?.id) {
      console.error("Invalid question:", selectedQuestion);
      alert("Invalid question. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // Validate totems array
    const validTotems = totems.filter(t => t && typeof t === 'string');
    if (validTotems.length !== totems.length) {
      console.error("Invalid totems found:", totems);
      alert("Some totems are invalid. Please try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const now = new Date();
      
      const newAnswer: ExtendedAnswer = {
        id: `${selectedQuestion.id}_${firebaseUid}_${now.getTime()}`,
        text: answer.trim(),
        firebaseUid,
        username,
        name,
        isVerified,
        createdAt: now.getTime(),
        upvotes: 0,
        downvotes: 0,
        totems: []
      };
      
      // Update the post with the new answer
      const postRef = doc(db, 'posts', selectedQuestion.id);
      await updateDoc(postRef, {
        answers: arrayUnion(newAnswer),
        lastEngagement: serverTimestamp()
      });
      
      // Add to user's answers collection
      const userAnswerRef = doc(db, 'userAnswers', firebaseUid, 'answers', newAnswer.id);
      await setDoc(userAnswerRef, {
        postId: selectedQuestion.id,
        answerId: newAnswer.id,
        timestamp: serverTimestamp()
      });
      
      setAnswer('');
      onAnswerSubmitted();
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
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

  const handleVerification = async () => {
    try {
      // First, reload the user to get the latest verification status
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          // User is already verified, update their profile
          const userRef = doc(db, "users", firebaseUid);
          await updateDoc(userRef, { verificationStatus: 'email_verified' });
          alert("Your account is already verified! You can now post answers.");
          setShowVerificationPrompt(false);
          return;
        }
      }

      await sendVerificationEmail();
      alert("Verification email sent! Please check your inbox and click the verification link. After verifying, come back and try posting again.");
      onAnswerSubmitted(); // Close the answer form
    } catch (error) {
      console.error("Error handling verification:", error);
      alert("Failed to handle verification. Please try again later.");
    }
  };

  if (showVerificationPrompt) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <h3 className="text-lg font-semibold mb-4">Verification Required</h3>
        <p className="text-gray-600 mb-6">
          You need to verify your email address to post answers. This helps maintain quality and prevent spam.
          We'll send you a verification link to your email address.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowVerificationPrompt(false)}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
          >
            Back to Answer
          </button>
          <button
            onClick={handleVerification}
            className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600"
          >
            Send Verification Email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">{selectedQuestion.question}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          className="w-full p-4 border rounded-xl resize-none"
          rows={4}
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
              const trimmedTotem = customTotem.trim();
              if (trimmedTotem) {
                handleTotemSelect(trimmedTotem);
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
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
            disabled={!answer.trim() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
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