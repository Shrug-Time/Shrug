import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db,
  sendVerificationEmail as sendVerificationEmailFn 
} from '@/firebase';
import { User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isVerified: boolean;
  verificationStatus: 'unverified' | 'email_verified' | 'phone_verified' | 'social_verified' | 'pending' | null;
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

  // Function to check verification status from Firestore
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
        
        // Update Firestore if needed
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().verificationStatus !== 'email_verified') {
          await updateDoc(doc(db, 'users', user.uid), {
            verificationStatus: 'email_verified'
          });
        }
        return;
      }

      // Then check Firestore for additional verification methods
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const status = userData.verificationStatus;
        
        // Check if user is verified through any method
        const verified = status === 'email_verified' || 
                        status === 'phone_verified' || 
                        status === 'social_verified';
        
        setIsVerified(verified);
        setVerificationStatus(status);
        
        // If Firebase says verified but Firestore doesn't, update Firestore
        if (currentUser?.emailVerified && status !== 'email_verified') {
          await updateDoc(doc(db, 'users', user.uid), {
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