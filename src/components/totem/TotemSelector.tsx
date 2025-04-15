'use client';

import { useState, useEffect } from 'react';
import { TotemService } from '@/services/totem';
import type { Totem, TotemSuggestion } from '@/types/models';

interface TotemSelectorProps {
  answerText: string;
  selectedTotems: Totem[];
  onTotemSelect: (totem: Totem) => void;
  onTotemCreate: (name: string, category: string) => void;
}

export function TotemSelector({
  answerText,
  selectedTotems,
  onTotemSelect,
  onTotemCreate
}: TotemSelectorProps) {
  const [suggestions, setSuggestions] = useState<TotemSuggestion[]>([]);
  const [newTotemName, setNewTotemName] = useState('');
  const [newTotemCategory, setNewTotemCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Function to suggest totems based on answer text
  const suggestTotems = async (debounced = true) => {
    // Skip if answer text is too short
    if (answerText.length < 15) {
      setSuggestions([]);
      return;
    }
    
    try {
      if (answerText) {
        const existingTotemNames = selectedTotems.map(t => t.name);
        // Use a stub function or the actual service if available
        // const newSuggestions = await TotemService.suggestTotems(
        //   answerText,
        //   existingTotemNames
        // );
        
        // Mock totem suggestions for now
        const mockSuggestions = [
          { 
            totemName: 'interesting', 
            confidence: 0.8, 
            reason: 'This is interesting content',
            category: 'positive',
          },
          { 
            totemName: 'helpful', 
            confidence: 0.9, 
            reason: 'This answer is helpful',
            category: 'positive',
          },
          { 
            totemName: 'funny', 
            confidence: 0.7, 
            reason: 'This is humorous',
            category: 'positive',
          },
        ].filter(t => !existingTotemNames.includes(t.totemName));
        
        setSuggestions(mockSuggestions);
        setShowSuggestions(mockSuggestions.length > 0);
      }
    } catch (error) {
      console.error('Error suggesting totems:', error);
      setSuggestions([]);
    }
  };

  const handleCreateTotem = () => {
    if (newTotemName && newTotemCategory) {
      onTotemCreate(newTotemName, newTotemCategory);
      setNewTotemName('');
      setNewTotemCategory('');
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.totemName}
            onClick={() => onTotemSelect(suggestion as unknown as Totem)}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
            title={suggestion.reason}
          >
            {suggestion.totemName} ({Math.round(suggestion.confidence * 100)}%)
          </button>
        ))}
      </div>

      {isCreating ? (
        <div className="space-y-2">
          <input
            type="text"
            value={newTotemName}
            onChange={(e) => setNewTotemName(e.target.value)}
            placeholder="New totem name"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="text"
            value={newTotemCategory}
            onChange={(e) => setNewTotemCategory(e.target.value)}
            placeholder="Category"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateTotem}
              disabled={!newTotemName || !newTotemCategory}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="text-blue-500 hover:text-blue-600"
        >
          + Create new totem
        </button>
      )}

      {selectedTotems.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Selected Totems:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedTotems.map((totem) => (
              <div
                key={totem.name}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full"
              >
                {totem.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 