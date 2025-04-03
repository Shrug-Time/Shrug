import { db } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import type { Post, TotemLike } from '@/types/models';

export class TotemService {
  /**
   * Handle totem like/unlike interaction
   */
  static async handleTotemLike(
    postId: string,
    totemName: string,
    userId: string,
    isUnlike: boolean = false
  ): Promise<Post> {
    const postRef = doc(db, "posts", postId);

    return runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) {
        throw new Error("Post not found");
      }

      const post = postDoc.data() as Post;
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
        (like) => like.userId === userId
      );

      if (existingLike) {
        // Update existing like
        existingLike.isActive = !isUnlike;
        existingLike.lastUpdatedAt = Date.now();
      } else if (!isUnlike) {
        // Add new like
        totem.likeHistory.push({
          userId,
          originalTimestamp: Date.now(),
          lastUpdatedAt: Date.now(),
          isActive: true,
          value: 1,
        });
      }

      // Update crispness
      totem.crispness = this.calculateCrispnessFromLikeHistory(totem.likeHistory);

      // Update only the answers array
      transaction.update(postRef, { answers: post.answers });

      return {
        ...post,
        id: postId,
      };
    });
  }

  /**
   * Calculate crispness from like history
   */
  static calculateCrispnessFromLikeHistory(likeHistory: TotemLike[]): number {
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
} 