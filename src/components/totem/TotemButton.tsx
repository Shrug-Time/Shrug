import React, { useState, useEffect } from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useAuthModal } from '@/hooks/useAuthModal';
import { AuthModal } from '@/components/auth/AuthModal';

interface TotemButtonProps {
  postId: string;
  totemName: string;
  answerId?: string; // Optional answer ID for specific totem instance
  className?: string;
  showCount?: boolean;
  showCrispnessValue?: boolean;
}

export function TotemButton({ 
  postId, 
  totemName, 
  answerId,
  className = '', 
  showCount = true, 
  showCrispnessValue = false 
}: TotemButtonProps) {
  const { user } = useAuth();
  const { toggleLike, isLiked, getLikeCount, getCrispness, loadPostTotems, loadTotemState } = useTotem();
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthModalOpen, setIsAuthModalOpen, handleAuthRequired } = useAuthModal();

  // Load totem state when component mounts
  useEffect(() => {
    if (user) {
      // If we have an answerId, load the specific totem instance
      if (answerId) {
        loadTotemState(postId, totemName, answerId);
      } else {
        loadPostTotems(postId, [totemName]);
      }
    }
  }, [postId, totemName, answerId, user, loadPostTotems, loadTotemState]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking the like button
    
    // Check auth status before proceeding
    const canProceed = handleAuthRequired(async () => {
      if (isLoading) return;
      
      setIsLoading(true);
      try {
        await toggleLike(postId, totemName, answerId);
      } catch (error) {
        console.error('[TotemButton] Error:', error);
      } finally {
        setIsLoading(false);
      }
    });

    if (!canProceed) {
      console.log('[TotemButton] Auth required or verification needed');
    }
  };

  const liked = user ? isLiked(postId, totemName, answerId) : false;
  const likeCount = getLikeCount(postId, totemName, answerId);
  const crispness = getCrispness(postId, totemName, answerId);
  const shouldShowCrispness = crispness !== undefined && crispness >= 0 && showCrispnessValue;

  return (
    <>
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="inline-flex items-center">
          <Link 
            href={`/post/${postId}/totem/${encodeURIComponent(totemName)}`}
            className={`inline-flex items-center px-2 py-1 rounded-l-md border border-r-0 ${
              liked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
            } hover:bg-gray-100 transition-colors`}
          >
            <span className={`text-sm font-medium ${liked ? 'text-blue-600' : 'text-gray-700'}`}>
              {totemName}
            </span>
          </Link>
          {showCount && (
            <button
              onClick={handleClick}
              disabled={isLoading}
              className={`inline-flex items-center px-2 py-1 border rounded-r-md text-sm transition-colors ${
                liked 
                  ? 'bg-blue-100 border-blue-200 text-blue-600 hover:bg-blue-200' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {likeCount}
            </button>
          )}
        </div>
        {shouldShowCrispness && (
          <span className="text-xs text-gray-500">
            {Math.round(crispness || 0)}% Crisp
          </span>
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
} 