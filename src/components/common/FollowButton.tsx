"use client";

import { useState, useEffect } from 'react';
import type { UserProfile } from '@/types/models';
import { useUser } from '@/hooks/useUser';
import { UserService } from '@/services/userService';

export interface FollowButtonProps {
  /** The current user's ID */
  currentUserId: string;
  /** The ID of the user to follow/unfollow */
  targetUserId: string;
  /** Optional className for styling */
  className?: string;
  onError?: (message: string) => void;
  onFollowChange?: () => void;
}

export function FollowButton({ currentUserId, targetUserId, className = '', onError, onFollowChange }: FollowButtonProps) {
  const { profile } = useUser();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Hide button if viewing own profile
  if (!profile || profile.firebaseUid === targetUserId) {
    return null;
  }

  // Check if already following
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const userData = await UserService.getUserByFirebaseUid(currentUserId);
        setIsFollowing(userData?.following?.includes(targetUserId) ?? false);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking follow status:', error);
        onError?.('Failed to check follow status');
        setIsLoading(false);
      }
    };
    checkFollowStatus();
  }, [currentUserId, targetUserId, onError]);

  const handleFollow = async () => {
    if (currentUserId === targetUserId) {
      onError?.('You cannot follow your own account');
      return;
    }

    try {
      setIsLoading(true);
      
      if (isFollowing) {
        // Unfollow the user
        await UserService.unfollowUser(currentUserId, targetUserId);
      } else {
        // Follow the user
        await UserService.followUser(currentUserId, targetUserId);
      }
      
      setIsFollowing(!isFollowing);
      onFollowChange?.();
    } catch (error) {
      console.error('Error updating follow status:', error);
      onError?.('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-200 text-gray-500 rounded-full"
      >
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      className={`${className} px-4 py-2 rounded-full ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
} 