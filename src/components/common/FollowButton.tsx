"use client";

import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

interface FollowButtonProps {
  /** The current user's ID */
  currentUserId: string;
  /** The ID of the user to follow/unfollow */
  targetUserId: string;
  /** Optional className for styling */
  className?: string;
}

export function FollowButton({ currentUserId, targetUserId, className = '' }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkFollowStatus() {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsFollowing(userData.following?.includes(targetUserId) || false);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking follow status:', error);
        setIsLoading(false);
      }
    }

    if (currentUserId && targetUserId) {
      checkFollowStatus();
    }
  }, [currentUserId, targetUserId]);

  const handleFollowClick = async () => {
    if (currentUserId === targetUserId) return; // Can't follow yourself
    
    try {
      setIsLoading(true);
      
      // Update current user's following list
      await updateDoc(doc(db, 'users', currentUserId), {
        following: isFollowing ? arrayRemove(targetUserId) : arrayUnion(targetUserId)
      });

      // Update target user's followers list
      await updateDoc(doc(db, 'users', targetUserId), {
        followers: isFollowing ? arrayRemove(currentUserId) : arrayUnion(currentUserId)
      });

      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error updating follow status:', error);
      alert('Failed to update follow status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUserId === targetUserId) return null; // Don't show button if viewing own profile
  if (isLoading) return <button className={`${className} opacity-50`} disabled>Loading...</button>;

  return (
    <button
      onClick={handleFollowClick}
      className={`${className} px-4 py-2 rounded-full font-medium transition-colors
        ${isFollowing 
          ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
      disabled={isLoading}
    >
      {isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
} 