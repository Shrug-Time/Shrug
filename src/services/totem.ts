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
      
      console.log(`TotemService.handleTotemLike - Initial totem state (${isUnlike ? 'unlike' : 'like'} operation):`, JSON.stringify(totem));
      console.log('TotemService.handleTotemLike - userId:', userId);
      
      // Initialize likeHistory if it doesn't exist
      if (!totem.likeHistory) {
        console.log('TotemService.handleTotemLike - likeHistory is undefined, initializing as empty array');
        totem.likeHistory = [];
      }
      
      // Also initialize legacy likedBy for backward compatibility
      if (!totem.likedBy) {
        console.log('TotemService.handleTotemLike - likedBy array is undefined, initializing as empty array');
        totem.likedBy = [];
      }
      
      // Find existing like in history
      const existingLikeIndex = totem.likeHistory.findIndex(like => like.userId === userId);
      const existingLike = existingLikeIndex !== -1 ? totem.likeHistory[existingLikeIndex] : null;
      
      // For backward compatibility, also check the legacy likedBy array
      const hasLegacyLike = totem.likedBy.includes(userId);
      
      const now = Date.now();
      
      // Handle unlike operation
      if (isUnlike) {
        // Check if user has liked this totem
        if (!existingLike && !hasLegacyLike) {
          console.error('TotemService.handleTotemLike - User has not liked this totem, cannot unlike');
          throw new Error("You haven't liked this totem yet!");
        }
        
        // Update like history if it exists
        if (existingLike) {
          // Mark the like as inactive
          existingLike.isActive = false;
          existingLike.lastUpdatedAt = now;
          totem.likeHistory[existingLikeIndex] = existingLike;
        }
        
        // Update legacy likedBy for backward compatibility
        if (hasLegacyLike) {
          totem.likedBy = totem.likedBy.filter(id => id !== userId);
        }
        
        // Decrement likes count
        totem.likes = Math.max(0, (totem.likes || 1) - 1);
        
        const updatedAnswers = this.updateTotemStatsAfterUnlike(post.answers, answerIdx, totemName, userId, now);
        
        // Update totem relationships based on similar answers
        const { groups } = SimilarityService.groupSimilarAnswers(updatedAnswers);
        const updatedTotems = SimilarityService.updateTotemRelationships(updatedAnswers, groups);
        
        // Update the post with new answers and totem relationships
        await updateDoc(doc(db, "posts", post.id), { 
          answers: this.updateTotemRelationships(updatedAnswers, updatedTotems),
          [COMMON_FIELDS.LAST_INTERACTION]: now,
          [COMMON_FIELDS.UPDATED_AT]: now
        });
        
        console.log('TotemService.handleTotemLike - Unlike completed successfully');
        
        return { 
          success: true, 
          action: 'unlike',
          post: await this.getUpdatedPost(post.id)
        };
      }
      
      // Handle like operation
      
      // If user already has an active like
      if ((existingLike && existingLike.isActive) || hasLegacyLike) {
        console.error('TotemService.handleTotemLike - User has already liked this totem');
        throw new Error("You've already liked this totem!");
      }
      
      // If user previously liked but then unliked, reactivate the like
      if (existingLike && !existingLike.isActive) {
        // Reactivate the like
        existingLike.isActive = true;
        existingLike.lastUpdatedAt = now;
        totem.likeHistory[existingLikeIndex] = existingLike;
        
        // For backward compatibility, add back to legacy likedBy
        if (!totem.likedBy.includes(userId)) {
          totem.likedBy.push(userId);
        }
        
        // Update likes count
        totem.likes = (totem.likes || 0) + 1;
        
        const updatedAnswers = this.updateTotemStatsAfterReLike(post.answers, answerIdx, totemName, userId, now);
        
        // Update totem relationships based on similar answers
        const { groups } = SimilarityService.groupSimilarAnswers(updatedAnswers);
        const updatedTotems = SimilarityService.updateTotemRelationships(updatedAnswers, groups);
        
        // Update the post with new answers and totem relationships
        await updateDoc(doc(db, "posts", post.id), { 
          answers: this.updateTotemRelationships(updatedAnswers, updatedTotems),
          [COMMON_FIELDS.LAST_INTERACTION]: now,
          [COMMON_FIELDS.UPDATED_AT]: now
        });
        
        console.log('TotemService.handleTotemLike - Re-like completed successfully');
        
        // Return information about it being a re-like with the original timestamp
        return { 
          success: true, 
          action: 'relike',
          originalTimestamp: existingLike.originalTimestamp,
          post: await this.getUpdatedPost(post.id)
        };
      }
      
      // This is a brand new like
      const newLike: TotemLike = {
        userId,
        originalTimestamp: now,
        lastUpdatedAt: now,
        isActive: true,
        value: 1
      };
      
      // Add to like history
      totem.likeHistory.push(newLike);
      
      // For backward compatibility, add to legacy likedBy
      if (!totem.likedBy.includes(userId)) {
        totem.likedBy.push(userId);
      }
      
      const updatedAnswers = this.updateTotemStats(post.answers, answerIdx, totemName, userId, now);
      
      // Update totem relationships based on similar answers
      const { groups } = SimilarityService.groupSimilarAnswers(updatedAnswers);
      const updatedTotems = SimilarityService.updateTotemRelationships(updatedAnswers, groups);
      
      // Update the post with new answers and totem relationships
      await updateDoc(doc(db, "posts", post.id), { 
        answers: this.updateTotemRelationships(updatedAnswers, updatedTotems),
        [COMMON_FIELDS.LAST_INTERACTION]: now,
        [COMMON_FIELDS.UPDATED_AT]: now
      });
      
      console.log('TotemService.handleTotemLike - New like completed successfully');
      
      return { 
        success: true, 
        action: 'like',
        post: await this.getUpdatedPost(post.id)
      };
    } catch (error) {
      console.error('Error handling totem like/unlike:', error);
      throw error;
    }
  }

  /**
   * Get updated post after like/unlike operations
   */
  private static async getUpdatedPost(postId: string): Promise<Post | null> {
    try {
      const postDoc = await getDoc(doc(db, "posts", postId));
      if (!postDoc.exists()) return null;
      return { id: postId, ...postDoc.data() } as Post;
    } catch (error) {
      console.error('Error getting updated post:', error);
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
                // Create a copy of the totem to avoid mutating the original
                const updatedTotem = { ...t };
                
                // Initialize likeHistory if it doesn't exist
                if (!updatedTotem.likeHistory) {
                  updatedTotem.likeHistory = [];
                }
                
                // Find existing like in history
                const existingLikeIndex = updatedTotem.likeHistory.findIndex(like => like.userId === userId);
                
                // If we found an existing like, mark it as inactive
                if (existingLikeIndex !== -1) {
                  updatedTotem.likeHistory[existingLikeIndex] = {
                    ...updatedTotem.likeHistory[existingLikeIndex],
                    isActive: false,
                    lastUpdatedAt: timestamp
                  };
                }
                
                // Update legacy arrays for backward compatibility
                updatedTotem.likedBy = (updatedTotem.likedBy || []).filter(id => id !== userId);
                
                // Calculate the new crispness based on active likes
                updatedTotem[TOTEM_FIELDS.CRISPNESS] = this.calculateCrispnessFromLikeHistory(updatedTotem.likeHistory);
                
                // Also update legacy crispness field for backward compatibility
                updatedTotem.crispness = updatedTotem[TOTEM_FIELDS.CRISPNESS];
                
                // Update standardized timestamps
                updatedTotem[COMMON_FIELDS.UPDATED_AT] = timestamp;
                updatedTotem[COMMON_FIELDS.LAST_INTERACTION] = timestamp;
                
                // Also update legacy timestamp fields for backward compatibility
                updatedTotem.updatedAt = timestamp;
                updatedTotem.lastInteraction = timestamp;
                
                console.log('TotemService.updateTotemStatsAfterUnlike - Updated totem:', {
                  name: updatedTotem.name,
                  likes: updatedTotem.likes,
                  crispness: updatedTotem.crispness,
                  likeHistoryCount: updatedTotem.likeHistory.length,
                  activeLikes: updatedTotem.likeHistory.filter(like => like.isActive).length
                });
                
                return updatedTotem;
              }
              return t;
            }),
            // Update standardized timestamps in the answer
            [COMMON_FIELDS.UPDATED_AT]: timestamp,
            [COMMON_FIELDS.LAST_INTERACTION]: timestamp
          }
        : ans
    );
  }

  /**
   * Update totem stats after a re-like
   */
  private static updateTotemStatsAfterReLike(
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
                
                // Find existing like in history
                const existingLikeIndex = updatedTotem.likeHistory.findIndex(like => like.userId === userId);
                
                // If we found an existing like, mark it as active
                if (existingLikeIndex !== -1) {
                  updatedTotem.likeHistory[existingLikeIndex] = {
                    ...updatedTotem.likeHistory[existingLikeIndex],
                    isActive: true,
                    lastUpdatedAt: timestamp
                  };
                } else {
                  // If no existing like found (shouldn't happen), create a new one
                  updatedTotem.likeHistory.push({
                    userId,
                    originalTimestamp: timestamp,
                    lastUpdatedAt: timestamp,
                    isActive: true,
                    value: 1
                  });
                }
                
                // Update likes count
                updatedTotem.likes = (updatedTotem.likes || 0) + 1;
                
                // Update legacy arrays for backward compatibility
                if (!updatedTotem.likedBy) {
                  updatedTotem.likedBy = [];
                }
                if (!updatedTotem.likedBy.includes(userId)) {
                  updatedTotem.likedBy.push(userId);
                }
                
                // Calculate the new crispness based on active likes
                updatedTotem[TOTEM_FIELDS.CRISPNESS] = this.calculateCrispnessFromLikeHistory(updatedTotem.likeHistory);
                
                // Also update legacy crispness field for backward compatibility
                updatedTotem.crispness = updatedTotem[TOTEM_FIELDS.CRISPNESS];
                
                // Update the lastLike timestamp
                updatedTotem[TOTEM_FIELDS.LAST_LIKE] = timestamp;
                updatedTotem.lastLike = timestamp;
                
                // Update standardized timestamps
                updatedTotem[COMMON_FIELDS.UPDATED_AT] = timestamp;
                updatedTotem[COMMON_FIELDS.LAST_INTERACTION] = timestamp;
                
                // Also update legacy timestamp fields for backward compatibility
                updatedTotem.updatedAt = timestamp;
                updatedTotem.lastInteraction = timestamp;
                
                console.log('TotemService.updateTotemStatsAfterReLike - Updated totem:', {
                  name: updatedTotem.name,
                  likes: updatedTotem.likes,
                  crispness: updatedTotem.crispness,
                  likeHistoryCount: updatedTotem.likeHistory.length,
                  activeLikes: updatedTotem.likeHistory.filter(like => like.isActive).length
                });
                
                return updatedTotem;
              }
              return t;
            }),
            // Update standardized timestamps in the answer
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
                
                // Update the likes count
                updatedTotem[TOTEM_FIELDS.LIKES] = (updatedTotem[TOTEM_FIELDS.LIKES] || 0) + 1;
                
                // Update the lastLike timestamp
                updatedTotem[TOTEM_FIELDS.LAST_LIKE] = timestamp;
                
                // Initialize likeHistory if it doesn't exist
                updatedTotem.likeHistory = updatedTotem.likeHistory || [];
                
                // Add new like to history
                updatedTotem.likeHistory.push({
                  userId,
                  originalTimestamp: timestamp,
                  lastUpdatedAt: timestamp,
                  isActive: true,
                  value: 1
                });
                
                // Ensure legacy arrays are initialized for backward compatibility
                updatedTotem[TOTEM_FIELDS.LIKE_TIMES] = updatedTotem[TOTEM_FIELDS.LIKE_TIMES] || [];
                updatedTotem[TOTEM_FIELDS.LIKE_VALUES] = updatedTotem[TOTEM_FIELDS.LIKE_VALUES] || [];
                updatedTotem[TOTEM_FIELDS.LIKED_BY] = updatedTotem[TOTEM_FIELDS.LIKED_BY] || [];
                
                // Also ensure legacy arrays are initialized for backward compatibility
                updatedTotem.likeTimes = updatedTotem.likeTimes || [];
                updatedTotem.likeValues = updatedTotem.likeValues || [];
                updatedTotem.likedBy = updatedTotem.likedBy || [];
                
                // Add the new like data using standardized field names
                updatedTotem[TOTEM_FIELDS.LIKE_TIMES] = [...updatedTotem[TOTEM_FIELDS.LIKE_TIMES], timestamp];
                updatedTotem[TOTEM_FIELDS.LIKE_VALUES] = [...updatedTotem[TOTEM_FIELDS.LIKE_VALUES], 1]; // Each like has a value of 1
                updatedTotem[TOTEM_FIELDS.LIKED_BY] = [...updatedTotem[TOTEM_FIELDS.LIKED_BY], userId];
                
                // Also update legacy arrays for backward compatibility
                updatedTotem.likeTimes = [...updatedTotem.likeTimes, timestamp];
                updatedTotem.likeValues = [...updatedTotem.likeValues, 1];
                updatedTotem.likedBy = [...updatedTotem.likedBy, userId];
                
                // Calculate the new crispness based on like history
                updatedTotem[TOTEM_FIELDS.CRISPNESS] = this.calculateCrispnessFromLikeHistory(updatedTotem.likeHistory);
                
                // Also update legacy crispness field for backward compatibility
                updatedTotem.crispness = updatedTotem[TOTEM_FIELDS.CRISPNESS];
                
                // Update standardized timestamps
                updatedTotem[COMMON_FIELDS.UPDATED_AT] = timestamp;
                updatedTotem[COMMON_FIELDS.LAST_INTERACTION] = timestamp;
                
                // Also update legacy timestamp fields for backward compatibility
                updatedTotem.updatedAt = timestamp;
                updatedTotem.lastInteraction = timestamp;
                
                // Log updated totem stats for debugging
                console.log('TotemService.updateTotemStats - Updated totem stats:', {
                  name: updatedTotem.name,
                  likes: updatedTotem[TOTEM_FIELDS.LIKES],
                  crispness: updatedTotem[TOTEM_FIELDS.CRISPNESS],
                  likeHistoryCount: updatedTotem.likeHistory.length,
                  activeLikes: updatedTotem.likeHistory.filter(like => like.isActive).length
                });
                
                return updatedTotem;
              }
              return t;
            }),
            // Update standardized timestamps in the answer
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