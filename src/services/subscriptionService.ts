/**
 * Subscription Service
 * 
 * Manages platform subscription tiers and membership verification.
 * Handles free vs. premium user features and status.
 */

import { db, auth } from '@/firebase';
import { 
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { UserService } from './userService';
import { MembershipTier, UserProfile } from '@/types/models';
import { USER_FIELDS } from '@/constants/fields';

/**
 * Service for managing platform subscription tiers and membership
 */
export class SubscriptionService {
  // Collection references
  private static readonly USERS_COLLECTION = 'users';
  private static readonly SUBSCRIPTIONS_COLLECTION = 'subscriptions';
  
  /**
   * Checks if a user has premium membership
   * @param firebaseUid Firebase UID of the user to check
   * @returns Whether the user has premium membership
   */
  static async isPremiumMember(firebaseUid: string): Promise<boolean> {
    try {
      const userProfile = await UserService.getUserByFirebaseUid(firebaseUid);
      return userProfile?.membershipTier === 'premium';
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  /**
   * Updates a user's membership tier
   * @param firebaseUid Firebase UID of the user to update
   * @param tier New membership tier
   * @returns Updated user profile
   */
  static async updateMembershipTier(
    firebaseUid: string,
    tier: MembershipTier
  ): Promise<UserProfile | null> {
    try {
      // If upgrading to premium, reset refreshes to higher limit
      const refreshesLimit = tier === 'premium' ? 20 : 5;
      
      // Update the user profile
      await UserService.updateProfile(firebaseUid, {
        membershipTier: tier,
        refreshesRemaining: refreshesLimit,
        refreshResetTime: Date.now()
      });
      
      // Record the subscription change
      await this.recordSubscriptionChange(firebaseUid, tier);
      
      // Return the updated profile
      return await UserService.getUserByFirebaseUid(firebaseUid);
    } catch (error) {
      console.error('Error updating membership tier:', error);
      throw error;
    }
  }
  
  /**
   * Records a subscription change for tracking and analytics
   */
  private static async recordSubscriptionChange(
    firebaseUid: string,
    tier: MembershipTier
  ): Promise<void> {
    try {
      const subscriptionRef = doc(collection(db, this.SUBSCRIPTIONS_COLLECTION));
      await setDoc(subscriptionRef, {
        firebaseUid,
        tier,
        previousTier: (await UserService.getUserByFirebaseUid(firebaseUid))?.membershipTier || 'free',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error recording subscription change:', error);
      // Non-critical failure, don't throw
    }
  }
  
  /**
   * Resets refresh counts for users based on their membership tier
   * This would typically be called by a scheduled function
   */
  static async resetDailyRefreshes(): Promise<number> {
    try {
      const usersRef = collection(db, this.USERS_COLLECTION);
      const snapshot = await getDocs(usersRef);
      
      let updateCount = 0;
      
      // Process each user
      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data() as UserProfile;
        const now = Date.now();
        const resetTime = userData.refreshResetTime;
        
        // Check if it's a new day (compare date portions of timestamps)
        const resetDate = new Date(resetTime);
        const todayDate = new Date(now);
        
        const isNewDay = 
          resetDate.getDate() !== todayDate.getDate() ||
          resetDate.getMonth() !== todayDate.getMonth() ||
          resetDate.getFullYear() !== todayDate.getFullYear();
        
        if (isNewDay) {
          // Reset refreshes based on membership tier
          const refreshLimit = userData.membershipTier === 'premium' ? 20 : 5;
          
          await updateDoc(doc(db, this.USERS_COLLECTION, userData.firebaseUid), {
            refreshesRemaining: refreshLimit,
            refreshResetTime: now
          });
          
          updateCount++;
        }
      }
      
      return updateCount;
    } catch (error) {
      console.error('Error resetting daily refreshes:', error);
      throw error;
    }
  }
  
  /**
   * Gets a user's remaining refreshes
   * @param firebaseUid Firebase UID of the user
   * @returns Number of refreshes remaining
   */
  static async getRemainingRefreshes(firebaseUid: string): Promise<number> {
    try {
      const userProfile = await UserService.getUserByFirebaseUid(firebaseUid);
      
      if (!userProfile) {
        return 0;
      }
      
      // Check if refreshes should be reset (new day)
      const now = Date.now();
      const resetTime = userProfile.refreshResetTime;
      
      const resetDate = new Date(resetTime);
      const todayDate = new Date(now);
      
      const isNewDay = 
        resetDate.getDate() !== todayDate.getDate() ||
        resetDate.getMonth() !== todayDate.getMonth() ||
        resetDate.getFullYear() !== todayDate.getFullYear();
      
      if (isNewDay) {
        // Reset refreshes based on membership tier
        const refreshLimit = userProfile.membershipTier === 'premium' ? 20 : 5;
        
        await UserService.updateRefreshes(firebaseUid, refreshLimit, now);
        return refreshLimit;
      }
      
      return userProfile.refreshesRemaining;
    } catch (error) {
      console.error('Error getting remaining refreshes:', error);
      return 0;
    }
  }
} 