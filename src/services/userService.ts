/**
 * Standardized User Service
 * 
 * Provides access to user data following the schema standards.
 * All user data operations should go through this service.
 */

import { auth, db, storage } from '@/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  runTransaction,
  limit,
  orderBy,
  QueryConstraint
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { UserProfile } from '@/types/models';
import { COMMON_FIELDS, USER_FIELDS } from '@/constants/fields';

/**
 * Service class for managing user data with standardized schema
 */
export class UserService {
  // Collection reference
  private static readonly USERS_COLLECTION = 'users';
  
  /**
   * Gets the current authenticated user's profile
   * @returns User profile or null if not authenticated
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      if (!auth.currentUser) return null;
      
      return this.getUserByFirebaseUid(auth.currentUser.uid);
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  /**
   * Creates a default profile for a new user
   * @param user Basic user information from authentication
   * @returns The created user profile
   */
  static async createDefaultProfile(user: { displayName?: string | null; email?: string | null }): Promise<UserProfile> {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      const firebaseUid = auth.currentUser.uid;
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
        firebaseUid,
        username,
        name: displayName,
        email: user.email || 'anonymous@example.com',
        bio: '',
        verificationStatus: auth.currentUser?.emailVerified ? 'email_verified' : 'unverified',
        membershipTier: 'free',
        refreshesRemaining: 5,
        refreshResetTime: timestamp,
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
        expertise: []
      };

      await setDoc(doc(db, this.USERS_COLLECTION, firebaseUid), defaultProfile);
      return defaultProfile;
    } catch (error) {
      console.error('Error creating default profile:', error);
      throw error;
    }
  }

  /**
   * Updates a user profile with partial data
   * @param firebaseUid Firebase auth UID
   * @param updates Partial profile updates
   * @returns Updated user profile
   */
  static async updateProfile(firebaseUid: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const userRef = doc(db, this.USERS_COLLECTION, firebaseUid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      // Ensure updates include updatedAt timestamp
      const timestampedUpdates = {
        ...updates,
        updatedAt: Date.now(),
        lastInteraction: Date.now()
      };
      
      await updateDoc(userRef, timestampedUpdates);
      
      // Get the updated user profile
      const updatedProfile = await this.getUserByFirebaseUid(firebaseUid);
      if (!updatedProfile) {
        throw new Error('Failed to retrieve updated profile');
      }
      
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Validates a username for uniqueness and format
   * @param username Username to validate
   * @param currentUsername Current username (to allow keeping the same username)
   * @returns Validation result with error if invalid
   */
  static async validateUsername(username: string, currentUsername?: string): Promise<{ isValid: boolean; error?: string }> {
    try {
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

      // Check if username is unique
      const usersRef = collection(db, this.USERS_COLLECTION);
      const usernameQuery = query(usersRef, where(USER_FIELDS.USERNAME, '==', username.toLowerCase()));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        return { isValid: false, error: "This username is already taken" };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error validating username:', error);
      throw error;
    }
  }
  
  /**
   * Gets a user profile by username
   * @param username Username to search for
   * @returns User profile or null if not found
   */
  static async getUserByUsername(username: string): Promise<UserProfile | null> {
    try {
      if (!username) {
        throw new Error('Username is required');
      }
      
      const usersRef = collection(db, this.USERS_COLLECTION);
      const q = query(
        usersRef,
        where(USER_FIELDS.USERNAME, '==', username.toLowerCase()),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      
      const userData = querySnapshot.docs[0];
      
      return {
        ...userData.data() as UserProfile,
        firebaseUid: userData.id
      };
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
      if (!firebaseUid) {
        throw new Error('Firebase UID is required');
      }
      
      const userDoc = await getDoc(doc(db, this.USERS_COLLECTION, firebaseUid));
      if (!userDoc.exists()) return null;
      
      return {
        ...userDoc.data() as UserProfile,
        firebaseUid: userDoc.id
      };
    } catch (error) {
      console.error('Error finding user by Firebase UID:', error);
      throw error;
    }
  }
  
  /**
   * Follow another user
   * @param currentUserUid Firebase UID of the user performing the follow
   * @param targetUserUid Firebase UID of the user to follow
   * @returns Success status
   */
  static async followUser(currentUserUid: string, targetUserUid: string): Promise<boolean> {
    try {
      if (currentUserUid === targetUserUid) {
        throw new Error('Cannot follow yourself');
      }
      
      // Use transaction to ensure data consistency
      await runTransaction(db, async (transaction) => {
        // Get both user documents
        const currentUserRef = doc(db, this.USERS_COLLECTION, currentUserUid);
        const targetUserRef = doc(db, this.USERS_COLLECTION, targetUserUid);
        
        const currentUserDoc = await transaction.get(currentUserRef);
        const targetUserDoc = await transaction.get(targetUserRef);
        
        if (!currentUserDoc.exists()) {
          throw new Error('Current user does not exist');
        }
        
        if (!targetUserDoc.exists()) {
          throw new Error('Target user does not exist');
        }
        
        // Get existing following/followers arrays
        const currentUserData = currentUserDoc.data() as UserProfile;
        const targetUserData = targetUserDoc.data() as UserProfile;
        
        const currentUserFollowing = currentUserData.following || [];
        const targetUserFollowers = targetUserData.followers || [];
        
        // Only update if not already following
        if (!currentUserFollowing.includes(targetUserUid)) {
          // Update current user's following list
          transaction.update(currentUserRef, {
            following: [...currentUserFollowing, targetUserUid],
            updatedAt: Date.now(),
            lastInteraction: Date.now()
          });
          
          // Update target user's followers list
          transaction.update(targetUserRef, {
            followers: [...targetUserFollowers, currentUserUid],
            updatedAt: Date.now()
          });
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  }
  
  /**
   * Unfollow another user
   * @param currentUserUid Firebase UID of the user performing the unfollow
   * @param targetUserUid Firebase UID of the user to unfollow
   * @returns Success status
   */
  static async unfollowUser(currentUserUid: string, targetUserUid: string): Promise<boolean> {
    try {
      // Use transaction to ensure data consistency
      await runTransaction(db, async (transaction) => {
        // Get both user documents
        const currentUserRef = doc(db, this.USERS_COLLECTION, currentUserUid);
        const targetUserRef = doc(db, this.USERS_COLLECTION, targetUserUid);
        
        const currentUserDoc = await transaction.get(currentUserRef);
        const targetUserDoc = await transaction.get(targetUserRef);
        
        if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
          throw new Error('One or both users do not exist');
        }
        
        // Get existing following/followers arrays
        const currentUserData = currentUserDoc.data() as UserProfile;
        const targetUserData = targetUserDoc.data() as UserProfile;
        
        const currentUserFollowing = currentUserData.following || [];
        const targetUserFollowers = targetUserData.followers || [];
        
        // Remove from arrays
        const updatedFollowing = currentUserFollowing.filter((id: string) => id !== targetUserUid);
        const updatedFollowers = targetUserFollowers.filter((id: string) => id !== currentUserUid);
        
        // Update current user's following list
        transaction.update(currentUserRef, {
          following: updatedFollowing,
          updatedAt: Date.now(),
          lastInteraction: Date.now()
        });
        
        // Update target user's followers list
        transaction.update(targetUserRef, {
          followers: updatedFollowers,
          updatedAt: Date.now()
        });
      });
      
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  }

  /**
   * Get users that a user is following
   * @param userId Firebase UID of the user
   * @returns Array of user profiles that the user is following
   */
  static async getFollowing(userId: string): Promise<UserProfile[]> {
    try {
      const userProfile = await this.getUserByFirebaseUid(userId);
      if (!userProfile) {
        throw new Error('User not found');
      }

      const followingIds = userProfile.following || [];
      if (followingIds.length === 0) {
        return [];
      }

      const followingProfiles: UserProfile[] = [];
      
      // Get profiles for all following IDs
      for (const followingId of followingIds) {
        try {
          const profile = await this.getUserByFirebaseUid(followingId);
          if (profile) {
            followingProfiles.push(profile);
          }
        } catch (error) {
          console.error(`Error fetching profile for ${followingId}:`, error);
          // Continue with other profiles even if one fails
        }
      }

      return followingProfiles;
    } catch (error) {
      console.error('Error getting following list:', error);
      throw error;
    }
  }

  /**
   * Get users that are following a user
   * @param userId Firebase UID of the user
   * @returns Array of user profiles that are following the user
   */
  static async getFollowers(userId: string): Promise<UserProfile[]> {
    try {
      const userProfile = await this.getUserByFirebaseUid(userId);
      if (!userProfile) {
        throw new Error('User not found');
      }

      const followerIds = userProfile.followers || [];
      if (followerIds.length === 0) {
        return [];
      }

      const followerProfiles: UserProfile[] = [];
      
      // Get profiles for all follower IDs
      for (const followerId of followerIds) {
        try {
          const profile = await this.getUserByFirebaseUid(followerId);
          if (profile) {
            followerProfiles.push(profile);
          }
        } catch (error) {
          console.error(`Error fetching profile for ${followerId}:`, error);
          // Continue with other profiles even if one fails
        }
      }

      return followerProfiles;
    } catch (error) {
      console.error('Error getting followers list:', error);
      throw error;
    }
  }
  
  /**
   * Updates a user's refresh count
   * @param firebaseUid Firebase UID of the user
   * @param refreshCount New refresh count
   * @param resetTimestamp Optional timestamp for refresh reset time (in milliseconds)
   * @returns Success status
   */
  static async updateRefreshes(
    firebaseUid: string, 
    refreshCount: number, 
    resetTimestamp?: number
  ): Promise<boolean> {
    try {
      const userRef = doc(db, this.USERS_COLLECTION, firebaseUid);
      
      const updates: Record<string, any> = {
        refreshesRemaining: refreshCount,
        updatedAt: Date.now(),
        lastInteraction: Date.now()
      };
      
      if (resetTimestamp) {
        updates.refreshResetTime = resetTimestamp;
      }
      
      await updateDoc(userRef, updates);
      return true;
    } catch (error) {
      console.error('Error updating refreshes:', error);
      throw error;
    }
  }

  /**
   * Upload avatar image and update user profile
   * @param file Image file to upload
   * @param userId Firebase user ID
   * @returns Updated user profile with new photoURL
   */
  static async uploadAvatar(file: File, userId: string): Promise<UserProfile> {
    try {
      console.log('UserService.uploadAvatar called with:', { fileName: file.name, fileSize: file.size, userId });
      
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      if (!db) {
        throw new Error('Firebase Firestore is not initialized');
      }

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('File size must be less than 5MB');
      }

      console.log('File validation passed, creating storage reference...');
      
      // Create storage reference
      const storageRef = ref(storage, `avatars/${userId}/${Date.now()}_${file.name}`);
      console.log('Storage reference created:', storageRef.fullPath);
      
      // Upload file
      console.log('Starting file upload...');
      const snapshot = await uploadBytes(storageRef, file);
      console.log('File upload completed, getting download URL...');
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Download URL obtained:', downloadURL);
      
      // Update user profile
      console.log('Updating user profile with new photoURL...');
      const updatedProfile = await this.updateProfile(userId, {
        photoURL: downloadURL
      });
      
      console.log('Profile update completed:', updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }

  /**
   * Remove avatar and update user profile
   * @param userId Firebase user ID
   * @returns Updated user profile with photoURL removed
   */
  static async removeAvatar(userId: string): Promise<UserProfile> {
    try {
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      // Get current profile to check if there's an existing photo
      const currentProfile = await this.getUserByFirebaseUid(userId);
      
      if (currentProfile?.photoURL) {
        // Delete from storage if it exists
        try {
          const storageRef = ref(storage, currentProfile.photoURL);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn('Could not delete old avatar from storage:', storageError);
          // Continue with profile update even if storage deletion fails
        }
      }
      
      // Update profile to remove photoURL
      const updatedProfile = await this.updateProfile(userId, {
        photoURL: undefined
      });
      
      return updatedProfile;
    } catch (error) {
      console.error('Error removing avatar:', error);
      throw error;
    }
  }
} 