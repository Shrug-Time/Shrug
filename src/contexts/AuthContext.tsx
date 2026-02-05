import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  sendVerificationEmail as sendVerificationEmailFn,
  signOut as firebaseSignOut
} from '@/firebase';
import { User } from 'firebase/auth';
import { UserService } from '@/services/userService';
import type { VerificationStatus, UserProfile } from '@/types/models';
import useFirebase from '@/hooks/useFirebase';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isVerified: boolean;
  verificationStatus: VerificationStatus | 'pending' | null;
  sendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { auth, isInitialized } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | 'pending' | null>(null);

  // Check for redirect result on initial load
  useEffect(() => {
    if (!auth || !isInitialized) return;

    const checkRedirectResult = async () => {
      try {
        // Dynamically import getAuthRedirectResult to avoid SSR issues
        const { getAuthRedirectResult } = await import('@/firebase');
        const result = await getAuthRedirectResult();
        if (result && result.user) {
          console.log("User signed in after redirect:", result.user.email);
          
          // Check if user profile exists
          let profile = await UserService.getUserByFirebaseUid(result.user.uid);
          
          // Create profile if it doesn't exist
          if (!profile) {
            profile = await UserService.createDefaultProfile({
              displayName: result.user.displayName,
              email: result.user.email
            });
          }
        }
      } catch (error) {
        console.error("Error processing redirect sign-in:", error);
      }
    };
    
    checkRedirectResult();
  }, [auth, isInitialized]);

  // Listen for auth state changes
  useEffect(() => {
    if (!auth || !isInitialized) return;

    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      console.log('Auth state changed:', authUser ? authUser.email : 'logged out');
      setUser(authUser);

      if (authUser) {
        try {
          // Get user profile
          console.log('Fetching user profile for:', authUser.uid);
          let profile = await UserService.getUserByFirebaseUid(authUser.uid);

          // Create profile if it doesn't exist
          if (!profile) {
            console.log('Profile not found, creating default profile...');
            profile = await UserService.createDefaultProfile({
              displayName: authUser.displayName,
              email: authUser.email
            });
            console.log('Default profile created successfully');
          } else {
            console.log('Profile found:', profile.username);
          }
          
          setUserProfile(profile);

          // Set verification status
          setVerificationStatus(profile.verificationStatus);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
        setVerificationStatus(null);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [auth, isInitialized]);

  const sendVerificationEmail = async () => {
    if (user) {
      await sendVerificationEmailFn();
    }
  };

  const refreshVerificationStatus = async () => {
    if (!auth || !user) return;
    
    await user.reload();
    const updatedUser = auth.currentUser;
    setUser(updatedUser);
    
    if (updatedUser?.emailVerified) {
      const profile = await UserService.getUserByFirebaseUid(updatedUser.uid);
      if (profile) {
        // Update user profile with email verified status if needed
        if (profile.verificationStatus === 'unverified') {
          await UserService.updateProfile(updatedUser.uid, {
            verificationStatus: 'email_verified'
          });
          setVerificationStatus('email_verified');
        } else {
          setVerificationStatus(profile.verificationStatus);
        }
      }
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut();
      // User state will be reset by the auth state listener
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    loading: loading || !isInitialized,
    isVerified: verificationStatus === 'email_verified' || verificationStatus === 'manual_verified',
    verificationStatus,
    sendVerificationEmail,
    refreshVerificationStatus,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 