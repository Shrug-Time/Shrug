import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  sendVerificationEmail as sendVerificationEmailFn 
} from '@/firebase';
import { User } from 'firebase/auth';
import { UserService } from '@/services/userService';
import type { VerificationStatus } from '@/types/models';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isVerified: boolean;
  verificationStatus: VerificationStatus | 'pending' | null;
  sendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isVerified: false,
  verificationStatus: null,
  sendVerificationEmail: async () => {},
  refreshVerificationStatus: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<AuthContextType['verificationStatus']>(null);

  // Function to check verification status from user profile
  const checkVerificationStatus = async (user: User | null) => {
    if (!user) {
      setIsVerified(false);
      setVerificationStatus(null);
      return;
    }

    try {
      // Reload the user to get the latest emailVerified status
      await user.reload();
      const currentUser = auth.currentUser;
      
      // First check Firebase Auth's emailVerified flag
      if (currentUser?.emailVerified) {
        setIsVerified(true);
        setVerificationStatus('email_verified');
        
        // Get the user profile from UserService
        const userProfile = await UserService.getUserByFirebaseUid(user.uid);
        
        // Update the profile if needed
        if (userProfile && userProfile.verificationStatus !== 'email_verified') {
          await UserService.updateProfile(user.uid, {
            verificationStatus: 'email_verified'
          });
        }
        return;
      }

      // Then check the user profile for verification status
      const userProfile = await UserService.getUserByFirebaseUid(user.uid);
      if (userProfile) {
        const status = userProfile.verificationStatus;
        
        // Check if user is verified through any method
        const verified = status === 'email_verified' || 
                        status === 'verified';
        
        setIsVerified(verified);
        setVerificationStatus(status);
        
        // If Firebase says verified but profile doesn't, update profile
        if (currentUser?.emailVerified && status !== 'email_verified') {
          await UserService.updateProfile(user.uid, {
            verificationStatus: 'email_verified'
          });
          setVerificationStatus('email_verified');
          setIsVerified(true);
        }
      } else {
        setIsVerified(false);
        setVerificationStatus('unverified');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setIsVerified(false);
    }
  };

  // Function to send verification email
  const sendVerificationEmail = async () => {
    try {
      await sendVerificationEmailFn();
      setVerificationStatus('pending');
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  };

  // Function to refresh verification status
  const refreshVerificationStatus = async () => {
    if (user) {
      await user.reload();
      const refreshedUser = auth.currentUser;
      setUser(refreshedUser);
      await checkVerificationStatus(refreshedUser);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      await checkVerificationStatus(authUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isVerified, 
      verificationStatus,
      sendVerificationEmail,
      refreshVerificationStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 