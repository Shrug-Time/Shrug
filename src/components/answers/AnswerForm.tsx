import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/useUser';
import type { Post, Totem } from '@/types/models';
import { PostService } from '@/services/standardized/PostService';
import { auth, sendVerificationEmail } from '@/firebase';
import { TotemSuggestionsService, type TotemSuggestion } from '@/services/totemSuggestions';

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
  const [suggestions, setSuggestions] = useState<TotemSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popularTotems, setPopularTotems] = useState<TotemSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { profile } = useUser();

  // Load popular totems on component mount
  useEffect(() => {
    const loadPopularTotems = async () => {
      try {
        const popular = await TotemSuggestionsService.getPopularTotems(8);
        setPopularTotems(popular);
      } catch (error) {
        console.error('Error loading popular totems:', error);
      }
    };

    loadPopularTotems();
  }, []);

  // Handle suggestion search
  useEffect(() => {
    const searchSuggestions = async () => {
      if (newTotem.trim().length > 0) {
        try {
          const results = await TotemSuggestionsService.searchTotems(newTotem, 6);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error searching totems:', error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(searchSuggestions, 200);
    return () => clearTimeout(debounceTimer);
  }, [newTotem]);

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

  const handleAddTotem = (totemName?: string) => {
    const totemToAdd = totemName || newTotem.trim();
    if (!totemToAdd) return;

    // Check if totem already exists (case-insensitive)
    if (selectedTotems.some(t => t.name.toLowerCase() === totemToAdd.toLowerCase())) {
      setError('This totem has already been added.');
      return;
    }

    const newTotemObj: Totem = {
      id: totemToAdd, // Keep original case for ID
      name: totemToAdd, // Keep original case for display
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTotem();
    } else if (e.key === ',' || e.key === ';') {
      e.preventDefault();
      handleAddTotem();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (newTotem.trim().length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSuggestionClick = (suggestion: TotemSuggestion) => {
    handleAddTotem(suggestion.name);
    setShowSuggestions(false);
    inputRef.current?.focus();
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
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Add Totems</h4>
            <span className="text-xs text-gray-500">Press Enter or comma to add</span>
          </div>
          
          {/* Tag-style input with chips */}
          <div className="relative">
            <div className="border rounded-lg p-3 min-h-[44px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Selected totems as chips */}
                {selectedTotems.map(totem => (
                  <span
                    key={totem.name}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                  >
                    {totem.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTotem(totem.name)}
                      className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none focus:bg-blue-500 focus:text-white"
                    >
                      <span className="sr-only">Remove {totem.name}</span>
                      <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                        <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6-6 6" />
                      </svg>
                    </button>
                  </span>
                ))}
                
                {/* Input field */}
                <input
                  ref={inputRef}
                  type="text"
                  value={newTotem}
                  onChange={(e) => setNewTotem(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder={selectedTotems.length === 0 ? "Type totem names (press Enter or comma to add)" : "Add another..."}
                  className="flex-1 min-w-[120px] outline-none text-sm py-1"
                />
              </div>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.name}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span className="font-medium">{suggestion.name}</span>
                    <span className="text-xs text-gray-500">Used {suggestion.count} times</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Popular totems quick-add */}
          {popularTotems.length > 0 && selectedTotems.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Popular totems:</p>
              <div className="flex flex-wrap gap-2">
                {popularTotems
                  .filter(popular => !selectedTotems.some(selected => selected.name.toLowerCase() === popular.name.toLowerCase()))
                  .map(popular => (
                    <button
                      key={popular.name}
                      type="button"
                      onClick={() => handleSuggestionClick(popular)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      {popular.name}
                    </button>
                  ))
                }
              </div>
            </div>
          )}
          
          {/* Helper text */}
          <p className="text-xs text-gray-500">
            Totems help categorize your answer. You can add multiple totems separated by commas or pressing Enter.
          </p>
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