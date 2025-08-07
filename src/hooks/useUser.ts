import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { UserService } from '@/services/userService';
import type { UserProfile } from '@/types/models';

export function useUser() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUserProfile = async (user: any) => {
    try {
      setIsLoading(true);
      let userProfile = await UserService.getCurrentUser();
      
      if (!userProfile) {
        userProfile = await UserService.createDefaultProfile(user);
      }
      
      setProfile(userProfile);
      setError(null);
      return userProfile;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load user profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!auth) {
      setProfile(null);
      setIsLoading(false);
      setError('Firebase auth is not initialized');
      return () => {};
    }
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (!user) {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        await fetchUserProfile(user);
      } catch (err) {
        console.error('Error in auth state change:', err);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const refetch = async () => {
    if (!auth?.currentUser) return;
    
    try {
      await fetchUserProfile(auth.currentUser);
    } catch (err) {
      console.error('Error refetching user profile:', err);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!auth || !auth.currentUser || !profile) return;

    try {
      setIsLoading(true);
      // Check if username is being updated and validate it
      if (updates.username && updates.username !== profile.username) {
        const validation = await UserService.validateUsername(updates.username, profile.username);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
      }

      const updatedProfile = await UserService.updateProfile(auth.currentUser.uid, updates);
      setProfile(updatedProfile);
      setError(null);
      return updatedProfile;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update profile';
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refetch,
  };
} 