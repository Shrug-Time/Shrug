"use client";

import { MouseEvent, memo, useState, useEffect } from 'react';
import { auth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { useTotem } from '@/contexts/TotemContext';

interface TotemButtonProps {
  name: string;
  likes: number;
  crispness?: number;
  onLike: () => Promise<void>;
  onUnlike: () => Promise<void>;
  isLiked: boolean;
  postId?: string;
}

function TotemButtonBase({ 
  name, 
  likes, 
  crispness, 
  onLike,
  onUnlike,
  isLiked,
  postId
}: TotemButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useTotem();

  const handleTotemClick = () => {
    if (!name) return;
    router.push(`/totem/${encodeURIComponent(name)}`);
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      if (isLiked) {
        await onUnlike();
      } else {
        await onLike();
      }
    } catch (error) {
      console.error('Error handling like click:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTotemColor = (name: string) => {
    switch (name.toLowerCase()) {
      case "all-natural":
        return "#4CAF50";
      case "name brand":
        return "#9C27B0";
      case "chicken-based":
        return "#FFCA28";
      default:
        const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 45%)`;
    }
  };

  const backgroundColor = getTotemColor(name);

  return (
    <div className="inline-flex flex-col items-center">
      <div className="flex items-center">
        <button
          onClick={handleTotemClick}
          className="flex items-center justify-center px-3 py-1 rounded-l-xl text-white shadow-sm transition-colors hover:shadow-md"
          style={{ backgroundColor }}
        >
          {name}
        </button>
        
        <button
          onClick={handleLikeClick}
          disabled={isLoading}
          className={`flex items-center justify-center px-3 py-1 rounded-r-xl text-white shadow-sm transition-colors hover:shadow-md cursor-pointer ${
            isLiked 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-500 hover:bg-gray-600'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ 
            backgroundColor: isLiked ? '#EF4444' : '#6B7280',
            minWidth: '40px',
            zIndex: 1
          }}
        >
          <span className="text-white/90 flex items-center">
            {likes}
          </span>
        </button>
        
        {crispness !== undefined && (
          <span className="ml-2 text-xs flex items-center justify-center bg-gray-100 w-14 h-6 rounded-full text-gray-500">
            {Math.round(crispness)}% fresh
          </span>
        )}
      </div>
    </div>
  );
}

// Memoization to prevent unnecessary re-renders
function propsAreEqual(prevProps: TotemButtonProps, nextProps: TotemButtonProps) {
  return (
    prevProps.name === nextProps.name &&
    prevProps.likes === nextProps.likes &&
    prevProps.crispness === nextProps.crispness &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.postId === nextProps.postId &&
    prevProps.onLike === nextProps.onLike &&
    prevProps.onUnlike === nextProps.onUnlike
  );
}

export const TotemButton = memo(TotemButtonBase, propsAreEqual); 