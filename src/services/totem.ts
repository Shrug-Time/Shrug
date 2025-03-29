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
  limit
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

export class TotemService {
  /**
   * Handle totem like/unlike interaction
   */
  static async handleTotemLike(
    post: Post,
    answerIdx: number,
    totemName: string,
    userId: string,
    isUnlike: boolean = false
  ) {
    try {
      const answer = post.answers[answerIdx];
      const totem = answer.totems.find(t => t.name === totemName);
      
      if (!totem) throw new Error('Totem not found');
      
      // Initialize likeHistory if it doesn't exist
      if (!totem.likeHistory) {
        totem.likeHistory = [];
      }
      
      const now = Date.now();
      
      // Find existing like
      const existingLikeIndex = totem.likeHistory.findIndex(like => like.userId === userId);
      const existingLike = existingLikeIndex !== -1 ? totem.likeHistory[existingLikeIndex] : null;
      
      // Handle unlike operation
      if (isUnlike) {
        // If there's no existing like or it's already inactive, just return success
        if (!existingLike || !existingLike.isActive) {
          return { 
            success: true, 
            action: 'unlike',
            post: await this.getUpdatedPost(post.id)
          };
        }
        
        // Mark the like as inactive
        existingLike.isActive = false;
        existingLike.lastUpdatedAt = now;
        totem.likeHistory[existingLikeIndex] = existingLike;
      } else {
        // Handle like operation
        if (existingLike) {
          if (existingLike.isActive) {
            throw new Error("You've already liked this totem!");
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
      
      // Update timestamps
      totem[COMMON_FIELDS.UPDATED_AT] = now;
      totem[COMMON_FIELDS.LAST_INTERACTION] = now;
      
      // Update the post
      await updateDoc(doc(db, "posts", post.id), { 
        answers: post.answers,
        [COMMON_FIELDS.LAST_INTERACTION]: now,
        [COMMON_FIELDS.UPDATED_AT]: now
      });
      
      // Get the updated post with retries
      const updatedPost = await this.getUpdatedPost(post.id);
      if (!updatedPost) {
        console.error('Failed to get updated post after like/unlike operation');
        return { 
          success: false, 
          action: isUnlike ? 'unlike' : 'like',
          post: null
        };
      }
      
      return { 
        success: true, 
        action: isUnlike ? 'unlike' : 'like',
        post: updatedPost
      };
    } catch (error) {
      console.error('Error in handleTotemLike:', error);
      throw error;
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
      
      // Update the lastLike timestamp
      totem.lastLike = now;
      
      // Recalculate crispness
      totem.crispness = this.calculateCrispnessFromLikeHistory(totem.likeHistory);
      
      // Update the document
      await updateDoc(doc(db, "posts", post.id), { 
        answers: post.answers,
        [COMMON_FIELDS.LAST_INTERACTION]: now,
        [COMMON_FIELDS.UPDATED_AT]: now
      });
      
      console.log('TotemService.refreshUserLike - Like refreshed successfully');
      
      return { 
        success: true,
        post: await this.getUpdatedPost(post.id)
      };
    } catch (error) {
      console.error('Error refreshing user like:', error);
      throw error;
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
    // Filter to only active likes
    const activeLikes = likeHistory.filter(like => like.isActive);
    
    if (activeLikes.length === 0) {
      return 0;
    }
    
    if (activeLikes.length === 1) {
      return 100;
    }
    
    const now = Date.now();
    const decayPeriod = DECAY_PERIODS.FAST; // Always use 1 week decay
    
    // Calculate individual crispness value for each like based on its original timestamp
    const individualCrispnessValues: number[] = [];
    
    activeLikes.forEach(like => {
      const timeSinceLike = now - like.originalTimestamp;
      // Calculate crispness based on original timestamp
      const likeCrispness = Math.max(0, 100 * (1 - (timeSinceLike / decayPeriod)));
      individualCrispnessValues.push(likeCrispness);
    });
    
    // Calculate the average crispness across all active likes
    const totalCrispness = individualCrispnessValues.reduce((sum, val) => sum + val, 0);
    const averageCrispness = totalCrispness / individualCrispnessValues.length;
    
    // Ensure crispness is between 0 and 100
    const boundedCrispness = Math.min(100, Math.max(0, averageCrispness));
    
    return parseFloat(boundedCrispness.toFixed(2));
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
      likedBy: [],
      likeTimes: [],
      likeValues: [],
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