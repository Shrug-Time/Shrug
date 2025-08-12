import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import type { Post, Totem } from '@/types/models';
import { PostService } from '@/services/standardized/PostService';
import { auth, sendVerificationEmail } from '@/firebase';

interface AnswerFormProps {
  selectedQuestion: Post;
  onAnswerSubmitted: () => void;
}

export function AnswerForm({ selectedQuestion, onAnswerSubmitted }: AnswerFormProps) {
  const [answer, setAnswer] = useState('');
  const [newTotem, setNewTotem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTotems, setSelectedTotems] = useState<Totem[]>([]);
  const { profile } = useUser();

  // Debug log for form props and state
  useEffect(() => {
    console.log('AnswerForm state:', {
      hasSelectedQuestion: !!selectedQuestion,
      questionId: selectedQuestion?.id,
      hasProfile: !!profile,
      profile: profile ? {
        firebaseUid: profile.firebaseUid,
        username: profile.username,
        verificationStatus: profile.verificationStatus
      } : null
    });
  }, [selectedQuestion, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    if (!profile) {
      setError('Please wait for your profile to load and try again.');
      return;
    }

    if (selectedTotems.length === 0) {
      setError('Please add at least one totem for your answer.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const now = Date.now();
      console.log('Submitting answer:', {
        questionId: selectedQuestion.id,
        answerLength: answer.trim().length,
        hasProfile: !!profile,
        selectedTotems
      });
      
      await PostService.addAnswer(selectedQuestion.id, {
        text: answer.trim(),
        firebaseUid: profile.firebaseUid,
        username: profile.username,
        name: profile.name || profile.username,
        isVerified: profile.verificationStatus === 'email_verified',
        isPremium: profile.membershipTier === 'premium',
        totems: selectedTotems || [],
        createdAt: now,
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

  const handleAddTotem = () => {
    if (!newTotem.trim()) return;

    // Check if totem already exists (case-insensitive)
    if (selectedTotems.some(t => t.name.toLowerCase() === newTotem.trim().toLowerCase())) {
      setError('This totem has already been added.');
      return;
    }

    const newTotemObj: Totem = {
      id: newTotem.trim(), // Keep original case for ID
      name: newTotem.trim(), // Keep original case for display
      likeHistory: [],
      crispness: 100,
      category: { id: 'general', name: 'General', description: '', children: [], usageCount: 0 },
      decayModel: 'MEDIUM',
      usageCount: 0
    };

    setSelectedTotems(prev => [...prev, newTotemObj]);
    setNewTotem('');
    setError(null);
  };

  const handleRemoveTotem = (totemName: string) => {
    setSelectedTotems(prev => prev.filter(t => t.name !== totemName));
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Your Answer</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          id="answer-text"
          name="answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your answer here..."
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
        />

        {/* Totem selection section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Add Totems</h4>
          
          {/* Add totem input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTotem}
              onChange={(e) => setNewTotem(e.target.value)}
              placeholder="Enter totem name"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAddTotem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Totem
            </button>
          </div>

          {/* Selected totems */}
          {selectedTotems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTotems.map(totem => (
                <div
                  key={totem.name}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
                >
                  <span>{totem.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTotem(totem.name)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
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
            disabled={isSubmitting || !answer.trim() || selectedTotems.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      </form>
    </div>
  );
} 