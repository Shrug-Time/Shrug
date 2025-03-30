import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import type { Post } from '@/types/models';
import { PostService } from '@/services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db, sendVerificationEmail, auth } from '@/firebase';

interface AnswerFormProps {
  selectedQuestion: Post;
  onAnswerSubmitted: () => void;
}

export function AnswerForm({ selectedQuestion, onAnswerSubmitted }: AnswerFormProps) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    if (!profile) {
      setError('Please wait for your profile to load and try again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const now = Date.now();
      await PostService.createAnswer(selectedQuestion.id, {
        text: answer.trim(),
        firebaseUid: profile.firebaseUid,
        username: profile.username,
        name: profile.name,
        isVerified: profile.verificationStatus === 'email_verified',
        totems: [],
        updatedAt: now,
        lastInteraction: now
      });
      
      onAnswerSubmitted();
    } catch (err) {
      setError('Failed to submit answer. Please try again.');
      console.error('Error submitting answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Your Answer</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your answer here..."
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
        />
        
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onAnswerSubmitted}
            className="px-4 py-2 text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !answer.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      </form>
    </div>
  );
} 