import React, { useState } from 'react';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface TotemButtonProps {
  postId: string;
  totemName: string;
  className?: string;
}

export function TotemButton({ postId, totemName, className = '' }: TotemButtonProps) {
  const { user } = useAuth();
  const { toggleLike, isLiked, getLikeCount } = useTotemV2();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!user) return;
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await toggleLike(postId, totemName);
    } catch (error) {
      console.error('[TotemButton] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const liked = user ? isLiked(postId, totemName) : false;
  const likeCount = getLikeCount(postId, totemName);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-lg text-gray-900">{totemName}</span>
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
  );
} 