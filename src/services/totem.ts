import { db } from '@/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import type { Post, TotemLike } from '@/types/models';
import { TotemService as StandardizedTotemService } from '@/services/standardized';

export class TotemService {
  /**
   * Handle totem like/unlike interaction
   * Returns the updated post data
   */
  static async handleTotemLike(
    postId: string,
    totemName: string,
    firebaseUid: string,
    isUnlike: boolean = false
  ): Promise<void> {
    console.log('🔧 [OLD] handleTotemLike called:', { postId, totemName, firebaseUid, isUnlike });
    
    if (!db) throw new Error("Firebase is not initialized");
    
    const postRef = doc(db, "posts", postId);

    const result = await runTransaction(db, async (transaction) => {
      // Get the current post state
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) {
        throw new Error("Post not found");
      }

      const post = postDoc.data() as Post;
      
      // Find the answer containing the totem
      const answer = post.answers.find(a => 
        a.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
      );
      const totem = answer?.totems.find(t => t.name.toLowerCase() === totemName.toLowerCase());

      if (!totem) {
        throw new Error("Totem not found");
      }

      // Initialize likeHistory if it doesn't exist
      if (!totem.likeHistory) {
        totem.likeHistory = [];
      }

      // Find existing like
      const existingLike = totem.likeHistory.find(
        (like) => like.firebaseUid === firebaseUid
      );

      if (existingLike) {
        // Check if this is a restore operation (inactive like becoming active)
        const wasInactive = !existingLike.isActive;
        
        // Update existing like
        existingLike.isActive = !isUnlike;
        
        // Only update lastUpdatedAt if this is NOT a restore operation
        // (i.e., if the like was already active, or if this is a new like)
        if (!wasInactive || !existingLike.isActive) {
          // This is either a new like, a refresh, or an unlike - update timestamp
          existingLike.lastUpdatedAt = Date.now();
        } else {
          // This is a restore operation - preserve the original timestamp
          // DO NOT modify originalTimestamp or lastUpdatedAt
        }
        // If restoring an inactive like (wasInactive && existingLike.isActive), 
        // keep the original lastUpdatedAt and originalTimestamp unchanged
      } else if (!isUnlike) {
        // Add new like
        totem.likeHistory.push({
          firebaseUid,
          originalTimestamp: Date.now(),
          lastUpdatedAt: Date.now(),
          isActive: true,
          value: 1,
        });
      }

      // Calculate crispness
      totem.crispness = this.calculateCrispnessFromLikeHistory(totem.likeHistory);

      // Update only the answers array
      transaction.update(postRef, { answers: post.answers });
    });
    
    console.log('✅ [OLD] handleTotemLike transaction completed successfully');
    
    // Update user's recent totems after successful interaction
    try {
      console.log('🔄 [OLD] Calling updateUserRecentTotems:', { firebaseUid, totemName });
      await StandardizedTotemService.updateUserRecentTotems(firebaseUid, totemName);
      console.log('✅ [OLD] updateUserRecentTotems completed successfully');
    } catch (error) {
      console.error('❌ [OLD] Error updating user recent totems:', error);
    }
  }

  /**
   * Check if a user has liked a totem
   */
  static async hasUserLiked(postId: string, totemName: string, firebaseUid: string): Promise<boolean> {
    if (!db) throw new Error("Firebase is not initialized");
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return false;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
    );
    const totem = answer?.totems.find(t => t.name.toLowerCase() === totemName.toLowerCase());

    if (!totem?.likeHistory) {
      return false;
    }

    return totem.likeHistory.some(
      like => like.firebaseUid === firebaseUid && like.isActive
    );
  }

  /**
   * Get the number of active likes on a totem
   */
  static async getActiveLikeCount(postId: string, totemName: string): Promise<number> {
    if (!db) throw new Error("Firebase is not initialized");
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return 0;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
    );
    const totem = answer?.totems.find(t => t.name.toLowerCase() === totemName.toLowerCase());

    if (!totem?.likeHistory) {
      return 0;
    }

    return totem.likeHistory.filter(like => like.isActive).length;
  }

  /**
   * Calculate crispness from like history
   */
  private static calculateCrispnessFromLikeHistory(likeHistory: TotemLike[]): number {
    const now = Date.now();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    
    // Consider ALL likes (both active and inactive) for crispness calculation
    // This ensures crispness decays over time regardless of like status
    if (!likeHistory || likeHistory.length === 0) return 0;

    // Calculate individual crispness for each like based on original timestamp
    const individualCrispnessValues = likeHistory.map(like => {
      const timeSinceLike = now - (like.originalTimestamp || like.lastUpdatedAt);
      const likeCrispness = Math.max(0, 100 * (1 - (timeSinceLike / ONE_WEEK_MS)));
      return likeCrispness;
    });

    // Calculate average crispness
    const totalCrispness = individualCrispnessValues.reduce((sum, val) => sum + val, 0);
    const averageCrispness = individualCrispnessValues.length > 0 
      ? totalCrispness / individualCrispnessValues.length 
      : 0;
    
    return parseFloat(averageCrispness.toFixed(2));
  }

  /**
   * Toggle like/unlike for a totem
   * Returns true if the operation was successful
   */
  static async toggleLike(
    postId: string,
    totemName: string,
    firebaseUid: string
  ): Promise<boolean> {
    try {
      console.log(`[DEBUG] toggleLike called - postId: ${postId}, totemName: ${totemName}, firebaseUid: ${firebaseUid}`);
      
      if (!db) throw new Error("Firebase is not initialized");
      
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        return false;
      }

      const post = postDoc.data() as Post;
      const answer = post.answers.find(a => 
        a.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
      );
      const totem = answer?.totems.find(t => t.name.toLowerCase() === totemName.toLowerCase());

      if (!totem) {
        return false;
      }

      // Check if user has already liked
      const isCurrentlyLiked = await this.hasUserLiked(postId, totemName, firebaseUid);
      console.log(`[DEBUG] toggleLike - isCurrentlyLiked: ${isCurrentlyLiked}`);
      
      // Toggle the like state
      console.log(`[DEBUG] toggleLike - calling handleTotemLike with isUnlike: ${isCurrentlyLiked}`);
      await this.handleTotemLike(postId, totemName, firebaseUid, isCurrentlyLiked);
      
      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  }

  /**
   * Get the crispness of a totem
   */
  static async getTotemCrispness(postId: string, totemName: string): Promise<number> {
    if (!db) throw new Error("Firebase is not initialized");
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return 0;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
    );
    const totem = answer?.totems.find(t => t.name.toLowerCase() === totemName.toLowerCase());

    if (!totem) {
      return 0;
    }

    return totem.crispness || 0;
  }
  
  /**
   * Check if a user has inactive likes for a totem
   */
  static async hasInactiveLikes(postId: string, totemName: string, firebaseUid: string): Promise<boolean> {
    if (!db) throw new Error("Firebase is not initialized");
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return false;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
    );
    const totem = answer?.totems.find(t => t.name.toLowerCase() === totemName.toLowerCase());

    if (!totem?.likeHistory) {
      return false;
    }

    return totem.likeHistory.some(
      like => like.firebaseUid === firebaseUid && !like.isActive
    );
  }
  
  /**
   * Get the crispness of an inactive like
   */
  static async getInactiveLikeCrispness(postId: string, totemName: string, firebaseUid: string): Promise<number> {
    if (!db) throw new Error("Firebase is not initialized");
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return 0;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
    );
    const totem = answer?.totems.find(t => t.name.toLowerCase() === totemName.toLowerCase());

    if (!totem?.likeHistory) {
      return 0;
    }

    const inactiveLike = totem.likeHistory.find(
      like => like.firebaseUid === firebaseUid && !like.isActive
    );

    if (!inactiveLike) {
      return 0;
    }

    // Calculate the crispness based on the inactive like's original timestamp
    const now = Date.now();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const timeSinceLike = now - inactiveLike.originalTimestamp;
    const likeCrispness = Math.max(0, 100 * (1 - (timeSinceLike / ONE_WEEK_MS)));
    
    return parseFloat(likeCrispness.toFixed(2));
  }
  
  /**
   * Refresh a previously inactive like to make it active
   */
  static async refreshLike(postId: string, totemName: string, firebaseUid: string): Promise<boolean> {
    console.log(`[DEBUG] refreshLike called - postId: ${postId}, totemName: ${totemName}, firebaseUid: ${firebaseUid}`);
    
    if (!db) throw new Error("Firebase is not initialized");
    
    const postRef = doc(db, "posts", postId);

    try {
      return runTransaction(db, async (transaction) => {
        // Get the current post state
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
          return false;
        }

        const post = postDoc.data() as Post;
        
        // Find the answer containing the totem
        const answer = post.answers.find(a => 
          a.totems.some(t => t.name.toLowerCase() === totemName.toLowerCase())
        );
        const totem = answer?.totems.find(t => t.name.toLowerCase() === totemName.toLowerCase());

        if (!totem || !totem.likeHistory) {
          return false;
        }

        // Find existing like
        const inactiveLikeIndex = totem.likeHistory.findIndex(
          (like) => like.firebaseUid === firebaseUid && !like.isActive
        );

        if (inactiveLikeIndex === -1) {
          return false; // No inactive like to refresh
        }

        console.log(`[DEBUG] refreshLike - updating like at index ${inactiveLikeIndex} to active`);
        
        // Update the like to be active and refresh the timestamp
        const newTimestamp = Date.now();
        totem.likeHistory[inactiveLikeIndex].isActive = true;
        totem.likeHistory[inactiveLikeIndex].originalTimestamp = newTimestamp; // Update original timestamp for crispness
        totem.likeHistory[inactiveLikeIndex].lastUpdatedAt = newTimestamp; // Update last updated timestamp

        // Calculate crispness
        totem.crispness = this.calculateCrispnessFromLikeHistory(totem.likeHistory);

        // Update only the answers array
        transaction.update(postRef, { answers: post.answers });
        return true;
      });
    } catch (error) {
      console.error('Error refreshing like:', error);
      return false;
    }
  }
} 