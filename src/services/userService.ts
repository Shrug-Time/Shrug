import { auth, db } from '@/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types/models';
import { COMMON_FIELDS, USER_FIELDS } from '@/constants/fields';

export class UserService {
  /**
   * Gets the current authenticated user's profile with standardized fields
   * @returns User profile or null if not authenticated
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    if (!auth.currentUser) return null;
    
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists()) {
      return this.standardizeUserData(userDoc.data() as Record<string, any>, auth.currentUser.uid);
    }
    return null;
  }

  /**
   * Creates a default profile for a new user
   * @param user Basic user information from authentication
   * @returns The created user profile
   */
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
    
    const timestamp = Date.now();
    
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
      createdAt: timestamp,
      updatedAt: timestamp,
      lastInteraction: timestamp,
      totems: {
        created: [],
        frequently_used: [],
        recent: []
      },
      expertise: [],
      
      // Set legacy fields for backward compatibility
      userID: username,
      userId: auth.currentUser?.uid || '',
      userName: displayName
    };

    if (auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), defaultProfile);
    }

    return defaultProfile;
  }

  /**
   * Updates a user profile with partial data
   * @param firebaseUid Firebase auth UID
   * @param updates Partial profile updates
   * @returns Updated user profile
   */
  static async updateProfile(firebaseUid: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const userRef = doc(db, 'users', firebaseUid);
    const currentData = (await getDoc(userRef)).data() || {};
    
    // Ensure updates include updatedAt timestamp
    const timestampedUpdates = {
      ...updates,
      updatedAt: Date.now(),
      lastInteraction: Date.now()
    };
    
    // Handle legacy field updates for backward compatibility
    if (updates.username) {
      timestampedUpdates.userID = updates.username;
    }
    
    if (updates.name) {
      timestampedUpdates.userName = updates.name;
    }
    
    const updatedData = { ...currentData, ...timestampedUpdates };
    await setDoc(userRef, updatedData);
    
    return this.standardizeUserData(updatedData, firebaseUid);
  }

  /**
   * Validates a username for uniqueness and format
   * @param username Username to validate
   * @param currentUsername Current username (to allow keeping the same username)
   * @returns Validation result with error if invalid
   */
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
      // First check username field
      const usernameQuery = query(usersRef, where(USER_FIELDS.USERNAME, '==', username.toLowerCase()));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        return { isValid: false, error: "This username is already taken" };
      }
      
      // Also check the legacy userID field
      const legacyQuery = query(usersRef, where(USER_FIELDS.LEGACY_USER_ID, '==', username.toLowerCase()));
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
  
  /**
   * Gets a user profile by username
   * @param username Username to search for
   * @returns User profile or null if not found
   */
  static async getUserByUsername(username: string): Promise<UserProfile | null> {
    try {
      // Try to find by new username field
      const usersRef = collection(db, 'users');
      let q = query(usersRef, where(USER_FIELDS.USERNAME, '==', username.toLowerCase()));
      let querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Try legacy userID field
        q = query(usersRef, where(USER_FIELDS.LEGACY_USER_ID, '==', username.toLowerCase()));
        querySnapshot = await getDocs(q);
      }
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const userData = querySnapshot.docs[0].data();
      const userId = querySnapshot.docs[0].id;
      
      return this.standardizeUserData(userData, userId);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }
  
  /**
   * Gets a user profile by Firebase UID
   * @param firebaseUid Firebase auth UID
   * @returns User profile or null if not found
   */
  static async getUserByFirebaseUid(firebaseUid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUid));
      if (!userDoc.exists()) return null;
      
      return this.standardizeUserData(userDoc.data(), firebaseUid);
    } catch (error) {
      console.error('Error finding user by Firebase UID:', error);
      throw error;
    }
  }
  
  /**
   * Helper to standardize user data from different sources
   * @param userData Raw user data from Firestore
   * @param firebaseUid Firebase auth UID
   * @returns Standardized UserProfile
   */
  private static standardizeUserData(userData: Record<string, any>, firebaseUid: string): UserProfile {
    // Handle timestamps
    const now = Date.now();
    let createdAt = userData.createdAt;
    
    // Convert string timestamps to numbers
    if (typeof createdAt === 'string') {
      createdAt = new Date(createdAt).getTime();
    }
    // Convert Firestore timestamps to numbers
    else if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt) {
      createdAt = createdAt.seconds * 1000;
    }
    
    // Standardize data format
    const standardized: UserProfile = {
      // Core identity (standardized fields)
      firebaseUid,
      username: userData.username || userData.userID || userData.userId || '',
      name: userData.name || userData.userName || '',
      
      // Profile content
      email: userData.email || '',
      bio: userData.bio || '',
      photoURL: userData.photoURL || '',
      
      // Status
      verificationStatus: userData.verificationStatus || 'unverified',
      membershipTier: userData.membershipTier || 'free',
      
      // Usage limits
      refreshesRemaining: userData.refreshesRemaining || 5,
      refreshResetTime: userData.refreshResetTime || new Date().toISOString(),
      
      // Social connections
      followers: userData.followers || [],
      following: userData.following || [],
      
      // Timestamps (standardized)
      createdAt: createdAt || now,
      updatedAt: userData.updatedAt || now,
      lastInteraction: userData.lastInteraction || now,
      
      // Totem relationships
      totems: userData.totems || {
        created: [],
        frequently_used: [],
        recent: []
      },
      
      // Expertise
      expertise: userData.expertise || [],
      
      // Legacy fields (for backward compatibility)
      userID: userData.userID || userData.username || '',
      userId: userData.userId || firebaseUid,
      userName: userData.userName || userData.name || ''
    };
    
    return standardized;
  }

  /**
   * Get the user profile with refresh quota information
   */
  static async getUserProfile(userId: string): Promise<UserProfile> {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Get the current user from auth if available
      const currentUser = auth.currentUser;
      
      // Create a default profile object with displayName and email
      return this.createDefaultProfile({
        displayName: currentUser?.displayName || null,
        email: currentUser?.email || null
      });
    }
    
    const userData = userDoc.data() as UserProfile;
    
    // Make sure refreshes field exists
    if (userData.refreshesRemaining === undefined) {
      userData.refreshesRemaining = 5; // Default starting quota
      await updateDoc(userRef, { refreshesRemaining: userData.refreshesRemaining });
    }
    
    return userData;
  }
  
  /**
   * Update refresh count for a user
   */
  static async updateRefreshes(userId: string, refreshCount: number, resetTimestamp?: string): Promise<boolean> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Get the current user from auth if available
        const currentUser = auth.currentUser;
        
        // Create a default profile with minimal info
        await this.createDefaultProfile({
          displayName: currentUser?.displayName || null,
          email: currentUser?.email || null
        });
      }
      
      const updateData: Record<string, any> = { refreshesRemaining: refreshCount };
      
      // Add reset timestamp if provided
      if (resetTimestamp) {
        updateData.refreshResetTime = resetTimestamp;
      }
      
      await updateDoc(userRef, updateData);
      return true;
    } catch (error) {
      console.error("Error updating refresh count:", error);
      return false;
    }
  }
} 