import React, { useState } from 'react';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useAuthModal } from '@/hooks/useAuthModal';
import { AuthModal } from '@/components/auth/AuthModal';

interface TotemButtonProps {
  postId: string;
  totemName: string;
  className?: string;
}

export function TotemButton({ postId, totemName, className = '' }: TotemButtonProps) {
  const { user } = useAuth();
  const { toggleLike, isLiked, getLikeCount, getCrispness } = useTotemV2();
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthModalOpen, setIsAuthModalOpen, handleAuthRequired } = useAuthModal();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking the like button
    
    // Check auth status before proceeding
    const canProceed = handleAuthRequired(async () => {
      if (isLoading) return;
      
      setIsLoading(true);
      try {
        await toggleLike(postId, totemName);
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

  const liked = user ? isLiked(postId, totemName) : false;
  const likeCount = getLikeCount(postId, totemName);
  const crispness = getCrispness(postId, totemName);
  const showCrispness = crispness !== undefined && crispness > 0;

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Link 
          href={`/post/${postId}/totem/${encodeURIComponent(totemName)}`}
          className="flex items-center gap-1"
        >
          <span className="text-lg text-gray-900 hover:text-blue-600">{totemName}</span>
          {showCrispness && (
            <span className="text-xs text-gray-500 ml-1">
              {Math.round(crispness)}% Crisp
            </span>
          )}
        </Link>
        <Button
          onClick={handleClick}
          variant="ghost"
          size="sm"
          disabled={isLoading}
          className={`flex items-center gap-1 ${
            liked ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'text-gray-500 hover:text-gray-600'
          }`}
        >
          <span className="text-sm">{likeCount}</span>
        </Button>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
} 