/**
 * Standardized User Service
 * 
 * Provides standardized access to user data following the schema standards.
 * All user data operations should go through this service to ensure consistency.
 */

import { auth, db } from '@/lib/firebase';
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
import { UserProfile } from '@/types/models';
import { COMMON_FIELDS, USER_FIELDS } from '@/constants/fields';
import { validateUserProfile } from '@/utils/schemaValidation';
import { handleServiceError, createTimestamp } from '@/utils/serviceHelpers';

/**
 * Service class for managing user data with standardized schema
 */
export class UserService {
  // Collection reference
  private static readonly USERS_COLLECTION = 'users';
  
  /**
   * Get current user profile
   * @returns Current user profile or null if not authenticated
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      if (!auth.currentUser) return null;
      
      return this.getUserByFirebaseUid(auth.currentUser.uid);
    } catch (error) {
      handleServiceError('get current user', error);
    }
  }
  
  /**
   * Get user profile by Firebase UID
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
      
      // Apply validation to ensure data consistency
      return validateUserProfile({
        ...userDoc.data(),
        firebaseUid: userDoc.id
      });
    } catch (error) {
      handleServiceError('get user by Firebase UID', error);
    }
  }
  
  /**
   * Get user profile by username
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
        where(USER_FIELDS.USERNAME, '==', username),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      
      const userData = querySnapshot.docs[0];
      
      // Apply validation to ensure data consistency
      return validateUserProfile({
        ...userData.data(),
        firebaseUid: userData.id
      });
    } catch (error) {
      handleServiceError('get user by username', error);
    }
  }
  
  /**
   * Create or update a user profile
   * @param userData User profile data to save
   * @returns Updated user profile
   */
  static async saveUserProfile(userData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      if (!userData.firebaseUid) {
        throw new Error('Firebase UID is required');
      }
      
      const userRef = doc(db, this.USERS_COLLECTION, userData.firebaseUid);
      const now = createTimestamp();
      
      // Check if user already exists
      const userDoc = await getDoc(userRef);
      const isNewUser = !userDoc.exists();
      
      // Prepare user data with timestamps
      const updatedUserData: Partial<UserProfile> = {
        ...userData,
        [COMMON_FIELDS.UPDATED_AT]: now,
        [COMMON_FIELDS.LAST_INTERACTION]: now
      };
      
      // For new users, add creation timestamp
      if (isNewUser) {
        updatedUserData[COMMON_FIELDS.CREATED_AT] = now;
      }
      
      // Validate data before saving
      const validatedData = validateUserProfile(updatedUserData);
      
      // Remove any undefined values
      const sanitizedData = Object.fromEntries(
        Object.entries(validatedData).filter(([_, v]) => v !== undefined)
      );
      
      // Save to database
      if (isNewUser) {
        await setDoc(userRef, sanitizedData);
      } else {
        await updateDoc(userRef, sanitizedData);
      }
      
      // Return the complete profile
      return validatedData;
    } catch (error) {
      handleServiceError('save user profile', error);
    }
  }
  
  /**
   * Update specific user profile fields
   * @param firebaseUid Firebase user ID
   * @param updates Fields to update
   * @returns Updated user profile
   */
  static async updateUserFields(
    firebaseUid: string, 
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      if (!firebaseUid) {
        throw new Error('Firebase UID is required');
      }
      
      const userRef = doc(db, this.USERS_COLLECTION, firebaseUid);
      const now = createTimestamp();
      
      // Always update timestamp fields
      const updateData = {
        ...updates,
        [COMMON_FIELDS.UPDATED_AT]: now,
        [COMMON_FIELDS.LAST_INTERACTION]: now
      };
      
      await updateDoc(userRef, updateData);
      
      // Get the updated user profile
      return await this.getUserByFirebaseUid(firebaseUid);
    } catch (error) {
      handleServiceError('update user fields', error);
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
            [COMMON_FIELDS.UPDATED_AT]: createTimestamp(),
            [COMMON_FIELDS.LAST_INTERACTION]: createTimestamp()
          });
          
          // Update target user's followers list
          transaction.update(targetUserRef, {
            followers: [...targetUserFollowers, currentUserUid],
            [COMMON_FIELDS.UPDATED_AT]: createTimestamp(),
            [COMMON_FIELDS.LAST_INTERACTION]: createTimestamp()
          });
        }
      });
      
      return true;
    } catch (error) {
      handleServiceError('follow user', error);
    }
  }
  
  /**
   * Unfollow a user
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
          return; // Skip if either user doesn't exist
        }
        
        // Get existing following/followers arrays
        const currentUserData = currentUserDoc.data() as UserProfile;
        const targetUserData = targetUserDoc.data() as UserProfile;
        
        const currentUserFollowing = currentUserData.following || [];
        const targetUserFollowers = targetUserData.followers || [];
        
        // Remove from following list
        transaction.update(currentUserRef, {
          following: currentUserFollowing.filter(uid => uid !== targetUserUid),
          [COMMON_FIELDS.UPDATED_AT]: createTimestamp(),
          [COMMON_FIELDS.LAST_INTERACTION]: createTimestamp()
        });
        
        // Remove from followers list
        transaction.update(targetUserRef, {
          followers: targetUserFollowers.filter(uid => uid !== currentUserUid),
          [COMMON_FIELDS.UPDATED_AT]: createTimestamp(),
          [COMMON_FIELDS.LAST_INTERACTION]: createTimestamp()
        });
      });
      
      return true;
    } catch (error) {
      handleServiceError('unfollow user', error);
    }
  }
} 