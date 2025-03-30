import { db } from '@/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  Timestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc,
  orderBy,
  addDoc,
  limit,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import type { Post, Answer, Totem, TotemSuggestion, TotemCategory, TotemRelationship, TotemLike } from '@/types/models';
import { SimilarityService } from './similarity';
import { COMMON_FIELDS, USER_FIELDS, TOTEM_FIELDS, TOTEM_RELATIONSHIP_FIELDS } from '@/constants/fields';
import { normalizeAnswerUserIds } from '@/utils/userIdHelpers';

const DECAY_PERIODS = {
  FAST: 7 * 24 * 60 * 60 * 1000,    // 1 week
  MEDIUM: 365 * 24 * 60 * 60 * 1000, // 1 year
  NONE: Infinity
} as const;

// Similarity threshold for grouping answers
const SIMILARITY_THRESHOLD = 0.7;

interface LikeResult {
  success: boolean;
  error?: string;
  isLiked: boolean;
  post: Post | null;
}

export class TotemService {
  /**
   * Handle totem like/unlike interaction
   */
  static async handleTotemLike(
    post: Post,
    answerIndex: number,
    totemName: string,
    userId: string,
    isUnliking: boolean
  ): Promise<LikeResult> {
    if (!post) {
      return {
        success: false,
        error: 'Post not found',
        isLiked: false,
        post: null
      };
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      const answer = post.answers[answerIndex];
      const totem = answer.totems.find(t => t.name === totemName);

      if (!totem) {
        return {
          success: false,
          error: 'Totem not found',
          isLiked: false,
          post: null
        };
      }

      // Initialize likeHistory if it doesn't exist
      if (!totem.likeHistory) {
        totem.likeHistory = [];
      }

      const now = Date.now();
      const existingLikeIndex = totem.likeHistory.findIndex(like => like.userId === userId);
      const existingLike = existingLikeIndex !== -1 ? totem.likeHistory[existingLikeIndex] : null;

      if (isUnliking) {
        if (!existingLike || !existingLike.isActive) {
          return {
            success: true,
            isLiked: false,
            post
          };
        }

        // Mark the like as inactive
        existingLike.isActive = false;
        existingLike.lastUpdatedAt = now;
        totem.likeHistory[existingLikeIndex] = existingLike;
      } else {
        if (existingLike) {
          if (existingLike.isActive) {
            return {
              success: false,
              error: "You've already liked this totem!",
              isLiked: true,
              post
            };
          }

          // Reactivate the like
          existingLike.isActive = true;
          existingLike.lastUpdatedAt = now;
          totem.likeHistory[existingLikeIndex] = existingLike;
        } else {
          // Create new like
          const newLike: TotemLike = {
            userId,
            originalTimestamp: now,
            lastUpdatedAt: now,
            isActive: true,
            value: 1
          };
          totem.likeHistory.push(newLike);
        }
      }

      // Calculate new likes count and crispness
      totem.likes = totem.likeHistory.filter(like => like.isActive).length;
      totem.crispness = this.calculateCrispnessFromLikeHistory(totem.likeHistory);
      totem.updatedAt = now;
      totem.lastInteraction = now;

      // Update the post
      await updateDoc(postRef, {
        answers: post.answers,
        lastInteraction: now,
        updatedAt: now
      });

      return {
        success: true,
        isLiked: !isUnliking,
        post: {
          ...post,
          answers: post.answers.map((ans, idx) => 
            idx === answerIndex ? answer : ans
          )
        }
      };
    } catch (error) {
      console.error('Error handling totem like:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update like status',
        isLiked: isUnliking,
        post: null
      };
    }
  }

  /**
   * Get updated post after like/unlike operations
   */
  private static async getUpdatedPost(postId: string, retries = 3): Promise<Post | null> {
    try {
      // Add a small delay to allow Firestore to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const postDoc = await getDoc(doc(db, "posts", postId));
      if (!postDoc.exists()) return null;
      
      const post = { id: postId, ...postDoc.data() } as Post;
      
      // Verify the post has the expected structure
      if (!post.answers || !Array.isArray(post.answers)) {
        if (retries > 0) {
          console.log('getUpdatedPost - Retrying due to invalid post structure');
          return this.getUpdatedPost(postId, retries - 1);
        }
        return null;
      }
      
      return post;
    } catch (error) {
      console.error('Error getting updated post:', error);
      if (retries > 0) {
        console.log('getUpdatedPost - Retrying due to error');
        return this.getUpdatedPost(postId, retries - 1);
      }
      return null;
    }
  }

  /**
   * Handle refreshing a user's like on a totem
   */
  static async refreshUserLike(
    post: Post,
    answerIdx: number,
    totemName: string,
    userId: string
  ) {
    try {
      const answer = post.answers[answerIdx];
      const totem = answer.totems.find(t => t.name === totemName);
      
      if (!totem) throw new Error('Totem not found');
      
      // Initialize likeHistory if it doesn't exist
      if (!totem.likeHistory) {
        console.log('TotemService.refreshUserLike - likeHistory is undefined, cannot refresh');
        throw new Error("No like history found for this totem");
      }
      
      // Find existing like in history
      const existingLikeIndex = totem.likeHistory.findIndex(like => like.userId === userId);
      
      if (existingLikeIndex === -1) {
        console.error('TotemService.refreshUserLike - User has not liked this totem');
        throw new Error("You haven't liked this totem yet!");
      }
      
      const existingLike = totem.likeHistory[existingLikeIndex];
      
      if (!existingLike.isActive) {
        console.error('TotemService.refreshUserLike - Cannot refresh an inactive like');
        throw new Error("Cannot refresh an inactive like. Please like the totem first.");
      }
      
      const now = Date.now();
      
      // Update the originalTimestamp to now
      existingLike.originalTimestamp = now;
      existingLike.lastUpdatedAt = now;
      totem.likeHistory[existingLikeIndex] = existingLike;
      
      // Recalculate crispness
      totem.crispness = this.calculateCrispnessFromLikeHistory(totem.likeHistory);
      
      // Update the document
      await updateDoc(doc(db, "posts", post.id), {
        answers: post.answers
      });

      return {
        success: true,
        post: {
          ...post,
          answers: post.answers.map((ans, idx) => 
            idx === answerIdx ? answer : ans
          )
        }
      };
    } catch (error) {
      console.error('Error refreshing like:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh like'
      };
    }
  }

  /**
   * Update totem stats after an unlike
   */
  private static updateTotemStatsAfterUnlike(
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
            totems: ans.totems.map((t) => {
              if (t.name === totemName) {
                const updatedTotem = { ...t };
                
                // Initialize likeHistory if it doesn't exist
                if (!updatedTotem.likeHistory) {
                  updatedTotem.likeHistory = [];
                }
                
                // Find existing like
                const existingLikeIndex = updatedTotem.likeHistory.findIndex(like => like.userId === userId);
                
                if (existingLikeIndex !== -1) {
                  // Mark like as inactive
                  updatedTotem.likeHistory[existingLikeIndex] = {
                    ...updatedTotem.likeHistory[existingLikeIndex],
                    isActive: false,
                    lastUpdatedAt: timestamp
                  };
                }
                
                // Update likes count based on active likes
                updatedTotem.likes = updatedTotem.likeHistory.filter(like => like.isActive).length;
                
                // Calculate crispness
                updatedTotem.crispness = this.calculateCrispnessFromLikeHistory(updatedTotem.likeHistory);
                
                // Update timestamps
                updatedTotem[COMMON_FIELDS.UPDATED_AT] = timestamp;
                updatedTotem[COMMON_FIELDS.LAST_INTERACTION] = timestamp;
                
                return updatedTotem;
              }
              return t;
            }),
            [COMMON_FIELDS.UPDATED_AT]: timestamp,
            [COMMON_FIELDS.LAST_INTERACTION]: timestamp
          }
        : ans
    );
  }

  /**
   * Calculate crispness from like history
   */
  private static calculateCrispnessFromLikeHistory(likeHistory: TotemLike[]): number {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Filter for active likes only
    const activeLikes = likeHistory.filter(like => like.isActive);
    
    if (activeLikes.length === 0) return 0;

    // Calculate average crispness based on last interaction time
    const totalCrispness = activeLikes.reduce((sum, like) => {
      const timeSinceLastInteraction = now - like.lastUpdatedAt;
      const decayFactor = Math.max(0, 1 - (timeSinceLastInteraction / oneWeek));
      return sum + decayFactor;
    }, 0);

    return totalCrispness / activeLikes.length;
  }

  /**
   * Update totem stats after a like
   */
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
            totems: ans.totems.map((t) => {
              if (t.name === totemName) {
                // Create a copy of the totem to avoid mutating the original
                const updatedTotem = { ...t };
                
                // Initialize likeHistory if it doesn't exist
                if (!updatedTotem.likeHistory) {
                  updatedTotem.likeHistory = [];
                }
                
                // Find existing like
                const existingLikeIndex = updatedTotem.likeHistory.findIndex(like => like.userId === userId);
                
                if (existingLikeIndex !== -1) {
                  // Update existing like
                  updatedTotem.likeHistory[existingLikeIndex] = {
                    ...updatedTotem.likeHistory[existingLikeIndex],
                    isActive: true,
                    lastUpdatedAt: timestamp
                  };
                } else {
                  // Add new like
                  updatedTotem.likeHistory.push({
                    userId,
                    originalTimestamp: timestamp,
                    lastUpdatedAt: timestamp,
                    isActive: true,
                    value: 1
                  });
                }
                
                // Update likes count based on active likes
                updatedTotem.likes = updatedTotem.likeHistory.filter(like => like.isActive).length;
                
                // Calculate crispness
                updatedTotem.crispness = this.calculateCrispnessFromLikeHistory(updatedTotem.likeHistory);
                
                // Update timestamps
                updatedTotem[COMMON_FIELDS.UPDATED_AT] = timestamp;
                updatedTotem[COMMON_FIELDS.LAST_INTERACTION] = timestamp;
                
                return updatedTotem;
              }
              return t;
            }),
            [COMMON_FIELDS.UPDATED_AT]: timestamp,
            [COMMON_FIELDS.LAST_INTERACTION]: timestamp
          }
        : ans
    );
  }

  /**
   * Update totem relationships in answers
   */
  private static updateTotemRelationships(answers: Answer[], updatedTotems: Totem[]): Answer[] {
    return answers.map(answer => ({
      ...answer,
      totems: answer.totems.map(totem => {
        const updatedTotem = updatedTotems.find(t => t.name === totem.name);
        return updatedTotem || totem;
      })
    }));
  }

  /**
   * Suggest totems based on answer text and existing totems
   */
  static async suggestTotems(text: string, existingTotems: string[]): Promise<TotemSuggestion[]> {
    // Get all totems ordered by usage count
    const totemsRef = collection(db, 'totems');
    const q = query(totemsRef, orderBy(TOTEM_FIELDS.USAGE_COUNT, 'desc'), limit(100));
    const snapshot = await getDocs(q);
    
    const allTotems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Totem[];
    
    // Filter out already used totems
    const availableTotems = allTotems.filter(totem => 
      !existingTotems.includes(totem.name)
    );
    
    // Calculate confidence for each totem
    const suggestions = await Promise.all(
      availableTotems.map(async totem => {
        const confidence = this.calculateConfidence(text, totem);
        
        return {
          totemName: totem.name,
          confidence,
          reason: confidence > 0.7 ? 'Strong match' : 'Possible match',
          category: totem.category?.name || 'Unknown'
        };
      })
    );
    
    // Sort by confidence and take the top 5
    return suggestions
      .filter(suggestion => suggestion.confidence > 0.4)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }
  
  /**
   * Calculate confidence of a totem match based on text
   */
  private static calculateConfidence(text: string, totem: Totem): number {
    // Simple implementation - check if totem name appears in text
    const lowerText = text.toLowerCase();
    const lowerTotemName = totem.name.toLowerCase();
    
    if (lowerText.includes(lowerTotemName)) {
      // Direct match
      return 0.9;
    }
    
    // TODO: Implement more sophisticated matching
    // This could use NLP, word embeddings, etc.
    
    return 0.4; // Default confidence
  }
  
  /**
   * Get answers containing specific totems
   */
  private static async getAnswersWithTotems(totemNames: string[]): Promise<Answer[]> {
    const postsRef = collection(db, 'posts');
    const snapshot = await getDocs(postsRef);
    
    const allAnswers: Answer[] = [];
    
    snapshot.docs.forEach(doc => {
      const post = doc.data() as Post;
      
      post.answers.forEach(answer => {
        // Check if the answer contains any of the specified totems
        const hasRequestedTotem = answer.totems.some(totem => 
          totemNames.includes(totem.name)
        );
        
        if (hasRequestedTotem) {
          // Standardize the answer format
          allAnswers.push(normalizeAnswerUserIds(answer));
        }
      });
    });
    
    return allAnswers;
  }
  
  /**
   * Create a new totem
   */
  static async createTotem(
    name: string,
    category: TotemCategory,
    decayModel: keyof typeof DECAY_PERIODS = 'MEDIUM'
  ): Promise<Totem> {
    // Check if totem already exists
    const totemsRef = collection(db, 'totems');
    const q = query(totemsRef, where(TOTEM_FIELDS.NAME, '==', name));
    const existingTotems = await getDocs(q);
    
    if (!existingTotems.empty) {
      // Totem already exists - return the existing one
      const existingTotem = {
        id: existingTotems.docs[0].id,
        ...existingTotems.docs[0].data()
      } as Totem;
      
      // Update usage count
      await updateDoc(doc(db, 'totems', existingTotem.id), {
        [TOTEM_FIELDS.USAGE_COUNT]: (existingTotem.usageCount || 0) + 1,
        [COMMON_FIELDS.UPDATED_AT]: Date.now(),
        [COMMON_FIELDS.LAST_INTERACTION]: Date.now()
      });
      
      return existingTotem;
    }
    
    // Create a new totem
    const timestamp = Date.now();
    const newTotem: Omit<Totem, 'id'> = {
      name,
      likes: 0,
      likeHistory: [],
      crispness: 0,
      category,
      decayModel,
      usageCount: 1,
      relationships: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      lastInteraction: timestamp
    };
    
    // Add to Firestore and get the generated ID
    const docRef = await addDoc(totemsRef, newTotem);
    
    // Return the complete Totem with the generated ID
    return {
      ...newTotem,
      id: docRef.id
    };
  }
  
  /**
   * Get or create a totem category
   */
  static async getOrCreateCategory(categoryName: string): Promise<TotemCategory> {
    const categoriesRef = collection(db, 'totemCategories');
    const q = query(categoriesRef, where('name', '==', categoryName));
    const existingCategories = await getDocs(q);
    
    if (!existingCategories.empty) {
      // Category already exists
      return {
        id: existingCategories.docs[0].id,
        ...existingCategories.docs[0].data()
      } as TotemCategory;
    }
    
    // Create a new category
    const newCategory: Omit<TotemCategory, 'id'> = {
      name: categoryName,
      description: `Category for ${categoryName}`,
      children: [],
      usageCount: 1
    };
    
    const docRef = await addDoc(categoriesRef, newCategory);
    
    return {
      ...newCategory,
      id: docRef.id
    };
  }
} 