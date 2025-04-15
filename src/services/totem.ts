import { db } from '@/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import type { Post, TotemLike } from '@/types/models';

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
    const postRef = doc(db, "posts", postId);

    return runTransaction(db, async (transaction) => {
      // Get the current post state
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) {
        throw new Error("Post not found");
      }

      const post = postDoc.data() as Post;
      
      // Find the answer containing the totem
      const answer = post.answers.find(a => 
        a.totems.some(t => t.name === totemName)
      );
      const totem = answer?.totems.find(t => t.name === totemName);

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
        // Update existing like
        existingLike.isActive = !isUnlike;
        existingLike.lastUpdatedAt = Date.now();
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
  }

  /**
   * Check if a user has liked a totem
   */
  static async hasUserLiked(postId: string, totemName: string, firebaseUid: string): Promise<boolean> {
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return false;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name === totemName)
    );
    const totem = answer?.totems.find(t => t.name === totemName);

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
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return 0;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name === totemName)
    );
    const totem = answer?.totems.find(t => t.name === totemName);

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
    
    const activeLikes = likeHistory.filter(like => like.isActive);
    if (activeLikes.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    activeLikes.forEach(like => {
      const timeSinceLike = now - like.lastUpdatedAt;
      const weight = Math.max(0, 1 - (timeSinceLike / ONE_WEEK_MS));
      
      weightedSum += weight * (like.value || 1);
      totalWeight += weight;
    });

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
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
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        return false;
      }

      const post = postDoc.data() as Post;
      const answer = post.answers.find(a => 
        a.totems.some(t => t.name === totemName)
      );
      const totem = answer?.totems.find(t => t.name === totemName);

      if (!totem) {
        return false;
      }

      // Check if user has already liked
      const isCurrentlyLiked = await this.hasUserLiked(postId, totemName, firebaseUid);
      
      // Toggle the like state
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
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return 0;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name === totemName)
    );
    const totem = answer?.totems.find(t => t.name === totemName);

    if (!totem) {
      return 0;
    }

    return totem.crispness || 0;
  }
  
  /**
   * Check if a user has inactive likes for a totem
   */
  static async hasInactiveLikes(postId: string, totemName: string, firebaseUid: string): Promise<boolean> {
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return false;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name === totemName)
    );
    const totem = answer?.totems.find(t => t.name === totemName);

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
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return 0;
    }

    const post = postDoc.data() as Post;
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name === totemName)
    );
    const totem = answer?.totems.find(t => t.name === totemName);

    if (!totem?.likeHistory) {
      return 0;
    }

    const inactiveLike = totem.likeHistory.find(
      like => like.firebaseUid === firebaseUid && !like.isActive
    );

    if (!inactiveLike) {
      return 0;
    }

    // Calculate the crispness based on a single inactive like
    const mockLikeHistory = [{ ...inactiveLike, isActive: true }];
    return this.calculateCrispnessFromLikeHistory(mockLikeHistory);
  }
  
  /**
   * Refresh a previously inactive like to make it active
   */
  static async refreshLike(postId: string, totemName: string, firebaseUid: string): Promise<boolean> {
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
          a.totems.some(t => t.name === totemName)
        );
        const totem = answer?.totems.find(t => t.name === totemName);

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

        // Update the like to be active
        totem.likeHistory[inactiveLikeIndex].isActive = true;
        totem.likeHistory[inactiveLikeIndex].lastUpdatedAt = Date.now();

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