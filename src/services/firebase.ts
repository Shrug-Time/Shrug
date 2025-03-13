import { db, auth } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  QueryConstraint,
  setDoc,
  serverTimestamp,
  documentId
} from 'firebase/firestore';
import type { Post, UserProfile, Answer } from '@/types/models';

const POSTS_PER_PAGE = 20;

export const PostService = {
  async getPaginatedPosts(
    lastVisible: any = null,
    filters: QueryConstraint[] = []
  ) {
    try {
      const postsRef = collection(db, 'posts');
      let constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc'),
        limit(POSTS_PER_PAGE)
      ];

      if (filters.length > 0) {
        constraints = [...filters, ...constraints];
      }

      if (lastVisible) {
        constraints.push(where('createdAt', '<', lastVisible));
      }

      const q = query(postsRef, ...constraints);
      const snapshot = await getDocs(q);

      return {
        posts: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post),
        lastVisible: snapshot.docs[snapshot.docs.length - 1]?.data().createdAt
      };
    } catch (error) {
      console.error('Error fetching paginated posts:', error);
      throw error;
    }
  },

  async getUserAnswers(userID: string, lastVisible: any = null) {
    try {
      const postsRef = collection(db, 'posts');
      const constraints: QueryConstraint[] = [
        where('answers', 'array-contains', { userID }),
        orderBy('createdAt', 'desc'),
        limit(POSTS_PER_PAGE)
      ];

      if (lastVisible) {
        constraints.push(where('createdAt', '<', lastVisible));
      }

      const q = query(postsRef, ...constraints);
      const snapshot = await getDocs(q);

      return {
        posts: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post),
        lastVisible: snapshot.docs[snapshot.docs.length - 1]?.data().createdAt
      };
    } catch (error) {
      console.error('Error fetching user answers:', error);
      throw error;
    }
  },

  async updatePostScore(postId: string, newScore: number) {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        score: newScore,
        lastScoreUpdate: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating post score:', error);
      throw error;
    }
  },

  async getUserPosts(userID: string) {
    try {
      console.log(`[getUserPosts] Starting to fetch posts for user ${userID}`);
      
      // Try to get posts where the user is the creator
      const postsRef = collection(db, 'posts');
      const createdPostsQuery = query(
        postsRef,
        where('userId', '==', userID)
      );
      
      console.log(`[getUserPosts] Fetching posts created by user`);
      const createdPostsSnapshot = await getDocs(createdPostsQuery);
      const createdPosts = createdPostsSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`[getUserPosts] Found created post:`, { id: doc.id, question: data.question });
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          lastEngagement: data.lastEngagement?.toMillis?.() || Date.now(),
          answers: (data.answers || []).map((answer: any) => ({
            ...answer,
            createdAt: answer.createdAt?.toMillis?.() || Date.now(),
            totems: answer.totems || []
          }))
        } as Post;
      });

      // Try to get posts where the user has answered
      const answeredPostsQuery = query(
        postsRef,
        where('answers', 'array-contains', { userId: userID })
      );
      
      console.log(`[getUserPosts] Fetching posts with user's answers`);
      const answeredPostsSnapshot = await getDocs(answeredPostsQuery);
      const answeredPosts = answeredPostsSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`[getUserPosts] Found answered post:`, { id: doc.id, question: data.question });
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          lastEngagement: data.lastEngagement?.toMillis?.() || Date.now(),
          answers: (data.answers || []).map((answer: any) => ({
            ...answer,
            createdAt: answer.createdAt?.toMillis?.() || Date.now(),
            totems: answer.totems || []
          }))
        } as Post;
      });

      // Combine and deduplicate posts
      const allPosts = [...createdPosts, ...answeredPosts];
      const uniquePosts = Array.from(new Map(allPosts.map(post => [post.id, post])).values());
      
      // Sort posts by lastEngagement
      uniquePosts.sort((a, b) => b.lastEngagement - a.lastEngagement);

      console.log(`[getUserPosts] Total posts found: ${uniquePosts.length} (${createdPosts.length} created, ${answeredPosts.length} answered)`);
      return uniquePosts;
    } catch (error) {
      console.error('[getUserPosts] Error fetching user posts:', error);
      throw error;
    }
  },

  async createAnswer(postId: string, answer: Omit<Answer, 'createdAt'>) {
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        throw new Error('Post not found');
      }

      const post = postDoc.data() as Post;
      const now = Date.now();
      const newAnswer: Answer = {
        ...answer,
        createdAt: now
      };

      // Update the post with the new answer
      await updateDoc(postRef, {
        answers: [...post.answers, newAnswer],
        lastEngagement: serverTimestamp()
      });

      // Track the answer in userAnswers collection
      await trackUserAnswer(answer.userId, postId);

      return newAnswer;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  },

  async migrateAnswersToUserAnswers() {
    try {
      const postsRef = collection(db, 'posts');
      const snapshot = await getDocs(postsRef);
      
      for (const postDoc of snapshot.docs) {
        const post = postDoc.data() as Post;
        const postId = postDoc.id;
        
        // Get unique user IDs from answers
        const userIds = new Set(post.answers.map(answer => answer.userId));
        
        // Create userAnswers entries for each user
        for (const userId of userIds) {
          await trackUserAnswer(userId, postId);
        }
      }
      
      console.log('Successfully migrated answers to userAnswers collection');
    } catch (error) {
      console.error('Error migrating answers:', error);
      throw error;
    }
  }
};

export class UserService {
  static async getUserProfile(userID: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', userID);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        console.log('Found user profile:', userDoc.data());
        return userDoc.data() as UserProfile;
      }
      
      console.log('No user profile found for:', userID);
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  static async checkPremiumStatus(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data() as UserProfile;
      return userData?.membershipTier === 'premium';
    } catch (error) {
      console.error('Error checking premium status:', error);
      throw error;
    }
  }
}

export class TotemService {
  static async handleTotemLike(
    post: Post,
    answerIdx: number,
    totemName: string,
    userId: string
  ) {
    try {
      const answer = post.answers[answerIdx];
      const totem = answer.totems.find(t => t.name === totemName);
      
      if (!totem) throw new Error('Totem not found');
      if (totem.likedBy.includes(userId)) {
        throw new Error("You've already liked this totem!");
      }

      const now = Date.now();
      const updatedAnswers = this.updateTotemStats(post.answers, answerIdx, totemName, userId, now);
      
      await updateDoc(doc(db, "posts", post.id), { 
        answers: updatedAnswers,
        lastEngagement: Timestamp.now()
      });

      return updatedAnswers;
    } catch (error) {
      console.error('Error handling totem like:', error);
      throw error;
    }
  }

  private static updateTotemStats(
    answers: Answer[],
    answerIdx: number,
    totemName: string,
    userId: string,
    timestamp: number
  ) {
    return answers.map((ans, idx) =>
      idx === answerIdx
        ? {
            ...ans,
            totems: ans.totems.map((t) =>
              t.name === totemName
                ? {
                    ...t,
                    likes: t.likes + 1,
                    likeTimes: [...(t.likeTimes || []).map(Number), timestamp],
                    likeValues: [...(t.likeValues || []), 1],
                    lastLike: timestamp,
                    likedBy: [...t.likedBy, userId],
                    crispness: this.calculateCrispness(
                      [...(t.likeValues || []), 1],
                      [...(t.likeTimes || []).map(Number), timestamp]
                    )
                  }
                : t
            ),
          }
        : ans
    );
  }

  private static calculateCrispness(likes: number[], timestamps: number[]): number {
    const now = Date.now();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    
    let totalWeight = 0;
    let weightedSum = 0;

    timestamps.forEach((timestamp, index) => {
      const timeSinceLike = now - timestamp;
      const weight = Math.max(0, 1 - (timeSinceLike / ONE_WEEK_MS));
      
      weightedSum += weight * likes[index];
      totalWeight += weight;
    });

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  }
}

// Helper function to track a user's answer in the userAnswers collection
export async function trackUserAnswer(userID: string, postID: string) {
  try {
    const userAnswerRef = doc(db, 'userAnswers', userID, 'posts', postID);
    await setDoc(userAnswerRef, {
      timestamp: serverTimestamp(),
      type: "answered"
    });
  } catch (error) {
    console.error('Error tracking user answer:', error);
    throw error;
  }
} 