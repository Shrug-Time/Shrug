import { auth, db } from '@/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/types/models';

export class UserService {
  static async getCurrentUser(): Promise<UserProfile | null> {
    if (!auth.currentUser) return null;
    
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  }

  static async createDefaultProfile(user: { displayName?: string | null; email?: string | null }): Promise<UserProfile> {
    const displayName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
    const emailPrefix = user.email?.split('@')[0] || 'user';
    
    const defaultProfile: UserProfile = {
      name: displayName,
      userID: emailPrefix.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'user',
      email: user.email || 'anonymous@example.com',
      bio: '',
      verificationStatus: auth.currentUser?.emailVerified ? 'email_verified' : 'unverified',
      membershipTier: 'free',
      refreshesRemaining: 5,
      refreshResetTime: new Date().toISOString(),
      following: [],
      followers: [],
      createdAt: new Date().toISOString(),
      totems: {
        created: [],
        frequently_used: [],
        recent: []
      },
      expertise: []
    };

    if (auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), defaultProfile);
    }

    return defaultProfile;
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const userRef = doc(db, 'users', userId);
    const currentProfile = (await getDoc(userRef)).data() as UserProfile;
    const updatedProfile = { ...currentProfile, ...updates };
    await setDoc(userRef, updatedProfile);
    return updatedProfile;
  }

  static async validateUserID(userID: string, currentUserID?: string): Promise<{ isValid: boolean; error?: string }> {
    // Check minimum length
    if (userID.length < 3) {
      return { isValid: false, error: "User ID must be at least 3 characters long" };
    }

    // Check maximum length
    if (userID.length > 15) {
      return { isValid: false, error: "User ID must be less than 15 characters" };
    }

    // If it's the same as current userID, no need to validate further
    if (userID === currentUserID) {
      return { isValid: true };
    }

    // Check if userID contains only allowed characters
    const validIDRegex = /^[a-z0-9_-]+$/;
    if (!validIDRegex.test(userID.toLowerCase())) {
      return { 
        isValid: false, 
        error: "User ID can only contain lowercase letters, numbers, underscores, and hyphens" 
      };
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('userID', '==', userID.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return { isValid: false, error: "This User ID is already taken" };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error checking User ID:', error);
      return { isValid: false, error: "Error checking User ID availability" };
    }
  }
} 