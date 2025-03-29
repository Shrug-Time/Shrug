"use client";

import { MouseEvent, memo, useState, useEffect } from 'react';
import { auth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

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
  console.log('TotemButton - Props received:', { 
    name, 
    likes, 
    isLiked, 
    postId,
    hasOnLike: !!onLike,
    hasOnUnlike: !!onUnlike
  });

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleTotemClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (postId) {
      router.push(`/post/${postId}/totem/${encodeURIComponent(name)}`);
    } else {
      router.push(`/totem/${encodeURIComponent(name)}`);
    }
  };

  const handleLikeClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('TotemButton - Click:', { isLiked, name, postId });
    
    if (isLoading) {
      console.log('TotemButton - Already loading, ignoring click');
      return;
    }
    
    setIsLoading(true);
    try {
      if (isLiked) {
        console.log('TotemButton - Calling onUnlike');
        await onUnlike();
      } else {
        console.log('TotemButton - Calling onLike');
        await onLike();
      }
    } catch (error) {
      console.error('TotemButton - Error:', error);
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
          className="flex items-center justify-center px-3 py-1 rounded-xl text-white shadow-sm transition-colors hover:shadow-md"
          style={{ backgroundColor }}
        >
          {name}
          <span className="ml-2 text-white/90 flex items-center">
            {likes}
          </span>
        </button>
        
        <div className="ml-2 flex items-center space-x-2">
          <button
            onClick={handleLikeClick}
            disabled={isLoading}
            className={`text-xs flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
              isLiked 
                ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isLiked ? "Unlike this totem" : "Like this totem"}
          >
            {isLiked ? '❤️' : '♡'}
          </button>
          
          {crispness !== undefined && (
            <span className="text-xs flex items-center justify-center bg-gray-100 w-14 h-6 rounded-full text-gray-500">
              {Math.round(crispness)}% fresh
            </span>
          )}
        </div>
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
    prevProps.postId === nextProps.postId
  );
}

export const TotemButton = memo(TotemButtonBase, propsAreEqual); 