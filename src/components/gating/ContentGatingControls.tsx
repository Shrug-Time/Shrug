import { useState, useEffect } from 'react';
import { useContentGating } from '@/contexts/ContentGatingContext';

interface ContentGatingControlsProps {
  contentId: string;
  creatorId: string;
  contentType: string;
  initialIsGated?: boolean;
  onGatingChange?: (isGated: boolean) => void;
}

export function ContentGatingControls({
  contentId,
  creatorId,
  contentType,
  initialIsGated = false,
  onGatingChange
}: ContentGatingControlsProps) {
  const { setContentGatingStatus, checkContentGatingStatus, isCreatorEligibleForGating } = useContentGating();
  const [isGated, setIsGated] = useState(initialIsGated);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check eligibility on mount
  useEffect(() => {
    const checkEligibility = async () => {
      try {
        const eligible = await isCreatorEligibleForGating(creatorId);
        setIsEligible(eligible);
      } catch (err) {
        console.error('Error checking eligibility:', err);
        setError('Could not verify creator eligibility for content gating.');
      }
    };
    
    checkEligibility();
  }, [creatorId, isCreatorEligibleForGating]);

  const handleToggleGating = async () => {
    if (!isEligible) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newStatus = !isGated;
      const success = await setContentGatingStatus(contentId, creatorId, newStatus);
      
      if (success) {
        setIsGated(newStatus);
        
        if (onGatingChange) {
          onGatingChange(newStatus);
        }
      } else {
        throw new Error('Failed to update gating status');
      }
    } catch (err) {
      console.error('Error updating content gating status:', err);
      setError('Failed to update content gating status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If the content is not an Answer, render a card with basic content info but no gating controls
  if (contentType !== 'Answer') {
    return (
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-3">Content Access Settings</h3>
        <div className="text-sm text-gray-500">
          This content is shared publicly.
        </div>
      </div>
    );
  }

  if (isEligible === null) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isEligible === false) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800">
        <h3 className="font-semibold mb-2">Content Access Controls</h3>
        <p className="text-sm">
          There may be an issue connecting to your account. 
          You can try refreshing the page or signing out and back in.
        </p>
        <button
          onClick={handleToggleGating}
          className="mt-3 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm"
        >
          Enable Content Gating Anyway
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-3">Content Access Settings</h3>
      
      {error && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">Make this content paid/exclusive?</p>
          <p className="text-xs text-gray-500 mt-1">
            Creator-exclusive content requires a separate payment to access.
          </p>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer"
            checked={isGated}
            onChange={handleToggleGating}
            disabled={isLoading}
          />
          <div className={`
            w-11 h-6 bg-gray-200 rounded-full peer 
            peer-focus:ring-4 peer-focus:ring-blue-300 
            dark:peer-focus:ring-blue-800 
            peer-checked:after:translate-x-full 
            peer-checked:after:border-white 
            after:content-[''] 
            after:absolute 
            after:top-0.5 
            after:left-[2px] 
            after:bg-white 
            after:border-gray-300 
            after:border 
            after:rounded-full 
            after:h-5 
            after:w-5 
            after:transition-all 
            dark:border-gray-600 
            peer-checked:bg-blue-600
            ${isLoading ? 'opacity-50' : ''}
          `}></div>
        </label>
      </div>
      
      <div className="mt-4 pt-3 border-t text-xs text-gray-500">
        <p>
          Creator-exclusive content allows you to monetize your expertise. This is separate from Shrug's platform subscription.
        </p>
      </div>
    </div>
  );
} 