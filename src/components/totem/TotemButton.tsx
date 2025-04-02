import React, { useState } from 'react';
import { useTotem } from '../../contexts/TotemContext';

interface TotemButtonProps {
  name: string;
  likes: number;
  isLiked: boolean;
  postId: string;
  onLike?: () => void;
  onUnlike?: () => void;
  className?: string;
}

export function TotemButton({ 
  name, 
  likes, 
  isLiked, 
  postId, 
  onLike, 
  onUnlike, 
  className = '' 
}: TotemButtonProps) {
  const { user } = useTotem();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!user || isLoading) return;
    
    setIsLoading(true);
    try {
      if (isLiked && onUnlike) {
        await onUnlike();
      } else if (!isLiked && onLike) {
        await onLike();
      }
    } catch (error) {
      console.error('Error handling totem interaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!user || isLoading}
      className={`
        relative group flex items-center gap-2 px-3 py-1.5 rounded-full
        text-sm font-medium transition-colors duration-200
        ${isLiked 
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
        ${!user ? 'opacity-50 cursor-not-allowed' : ''}
        ${isLoading ? 'opacity-50 cursor-wait' : ''}
        ${className}
      `}
    >
      <span className="relative">
        {name}
        {isLiked && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </span>
      <span className="text-xs opacity-75">{likes}</span>
    </button>
  );
} 