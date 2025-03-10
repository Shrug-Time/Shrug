"use client";

import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { UserProfile } from '@/types/models';

export interface FollowButtonProps {
  /** The current user's ID */
  currentUserId: string;
  /** The ID of the user to follow/unfollow */
  targetUserId: string;
  /** Optional className for styling */
  className?: string;
  onError?: (message: string) => void;
}

export function FollowButton({ currentUserId, targetUserId, className = '', onError }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent self-following
  if (currentUserId === targetUserId) {
    return null;
  }

  // Check if already following
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        const userData = userDoc.data() as UserProfile;
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

  const ensureUserExists = async (userId: string, isTarget: boolean = false) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create a basic user document if it doesn't exist
      await setDoc(userRef, {
        userID: userId,
        name: isTarget ? targetUserId : userId, // Use userID as name if not available
        followers: [],
        following: [],
        createdAt: new Date(),
        verificationStatus: 'unverified',
        membershipTier: 'free',
      });
    }
    return userDoc.exists() ? userDoc.data() as UserProfile : null;
  };

  const handleFollow = async () => {
    if (currentUserId === targetUserId) {
      onError?.('You cannot follow your own account');
      return;
    }

    try {
      setIsLoading(true);
      
      // Ensure both users exist and get their data
      const [currentUserData, targetUserData] = await Promise.all([
        ensureUserExists(currentUserId),
        ensureUserExists(targetUserId, true)
      ]);

      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      if (isFollowing) {
        // Unfollow
        await updateDoc(currentUserRef, {
          following: arrayRemove(targetUserId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUserId)
        });
        setIsFollowing(false);
      } else {
        // Follow
        await updateDoc(currentUserRef, {
          following: arrayUnion(targetUserId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUserId)
        });
        setIsFollowing(true);
      }
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