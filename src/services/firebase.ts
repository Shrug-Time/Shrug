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
  serverTimestamp
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
      // First get the user's answer references
      const userAnswersRef = collection(db, 'userAnswers', userID, 'posts');
      const userAnswersSnapshot = await getDocs(userAnswersRef);

      if (userAnswersSnapshot.empty) {
        console.log(`No posts found for user ${userID}`);
        return [];
      }

      // Get all the post IDs
      const postIds = userAnswersSnapshot.docs.map(doc => doc.id);

      // Then fetch the actual posts
      const posts: Post[] = [];
      const chunkSize = 10; // Firestore has a limit on 'in' queries

      // Split the post IDs into chunks to avoid query limits
      for (let i = 0; i < postIds.length; i += chunkSize) {
        const chunk = postIds.slice(i, i + chunkSize);
        const postsRef = collection(db, 'posts');
        const q = query(
          postsRef,
          where('id', 'in', chunk),
          orderBy('lastEngagement', 'desc')
        );

        const snapshot = await getDocs(q);
        posts.push(...snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Post)));
      }

      console.log(`Found ${posts.length} posts for user ${userID}`);
      return posts;
    } catch (error) {
      console.error('Error fetching user posts:', error);
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
      const newAnswer: Answer = {
        ...answer,
        createdAt: new Date().toISOString()
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

      const now = new Date().toISOString();
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
    timestamp: string
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
                    likeTimes: [...(t.likeTimes || []), timestamp],
                    likeValues: [...(t.likeValues || []), 1],
                    lastLike: timestamp,
                    likedBy: [...t.likedBy, userId],
                    crispness: this.calculateCrispness(
                      [...(t.likeValues || []), 1],
                      [...(t.likeTimes || []), timestamp]
                    )
                  }
                : t
            ),
          }
        : ans
    );
  }

  private static calculateCrispness(likes: number[], timestamps: string[]): number {
    const now = new Date().getTime();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    
    let totalWeight = 0;
    let weightedSum = 0;

    timestamps.forEach((timestamp, index) => {
      const likeTime = new Date(timestamp).getTime();
      const timeSinceLike = now - likeTime;
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
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error tracking user answer:', error);
    throw error;
  }
} 