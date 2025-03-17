import { auth, db } from '@/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/types/models';

export class UserService {
  static async getCurrentUser(): Promise<UserProfile | null> {
    if (!auth.currentUser) return null;
    
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Handle legacy data format
      if (userData.userID && !userData.username) {
        userData.username = userData.userID;
        userData.firebaseUid = auth.currentUser.uid;
      }
      return userData as UserProfile;
    }
    return null;
  }

  static async createDefaultProfile(user: { displayName?: string | null; email?: string | null }): Promise<UserProfile> {
    const displayName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
    const emailPrefix = user.email?.split('@')[0] || 'user';
    const usernameBase = emailPrefix.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'user';
    
    // Ensure username is unique
    let username = usernameBase;
    let counter = 1;
    let isUnique = false;
    
    while (!isUnique) {
      const validation = await this.validateUsername(username);
      if (validation.isValid) {
        isUnique = true;
      } else {
        username = `${usernameBase}${counter}`;
        counter++;
      }
    }
    
    const defaultProfile: UserProfile = {
      firebaseUid: auth.currentUser?.uid || '',
      username,
      name: displayName,
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

  static async updateProfile(firebaseUid: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const userRef = doc(db, 'users', firebaseUid);
    const currentProfile = (await getDoc(userRef)).data() as UserProfile;
    const updatedProfile = { ...currentProfile, ...updates };
    await setDoc(userRef, updatedProfile);
    return updatedProfile;
  }

  static async validateUsername(username: string, currentUsername?: string): Promise<{ isValid: boolean; error?: string }> {
    // Check minimum length
    if (username.length < 3) {
      return { isValid: false, error: "Username must be at least 3 characters long" };
    }

    // Check maximum length
    if (username.length > 15) {
      return { isValid: false, error: "Username must be less than 15 characters" };
    }

    // If it's the same as current username, no need to validate further
    if (username === currentUsername) {
      return { isValid: true };
    }

    // Check if username contains only allowed characters
    const validUsernameRegex = /^[a-z0-9_-]+$/;
    if (!validUsernameRegex.test(username.toLowerCase())) {
      return { 
        isValid: false, 
        error: "Username can only contain lowercase letters, numbers, underscores, and hyphens" 
      };
    }

    try {
      const usersRef = collection(db, 'users');
      // Check both new and legacy field names during transition
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return { isValid: false, error: "This username is already taken" };
      }
      
      // Also check the legacy userID field
      const legacyQuery = query(usersRef, where('userID', '==', username.toLowerCase()));
      const legacySnapshot = await getDocs(legacyQuery);
      
      if (!legacySnapshot.empty) {
        return { isValid: false, error: "This username is already taken" };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error checking username:', error);
      return { isValid: false, error: "Error checking username availability" };
    }
  }
  
  static async getUserByUsername(username: string): Promise<UserProfile | null> {
    try {
      // Try to find by new username field
      const usersRef = collection(db, 'users');
      let q = query(usersRef, where('username', '==', username.toLowerCase()));
      let querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Try legacy userID field
        q = query(usersRef, where('userID', '==', username.toLowerCase()));
        querySnapshot = await getDocs(q);
      }
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return querySnapshot.docs[0].data() as UserProfile;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }
  
  static async getUserByFirebaseUid(firebaseUid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUid));
      if (!userDoc.exists()) return null;
      return userDoc.data() as UserProfile;
    } catch (error) {
      console.error('Error finding user by Firebase UID:', error);
      throw error;
    }
  }
} 