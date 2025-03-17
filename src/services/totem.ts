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
import type { Post, Answer, Totem, TotemSuggestion, TotemCategory } from '@/types/models';
import { SimilarityService } from './similarity';

const DECAY_PERIODS = {
  FAST: 7 * 24 * 60 * 60 * 1000,    // 1 week
  MEDIUM: 365 * 24 * 60 * 60 * 1000, // 1 year
  NONE: Infinity
} as const;

// Similarity threshold for grouping answers
const SIMILARITY_THRESHOLD = 0.7;

export class TotemService {
  /**
   * Handle totem like interaction
   */
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
      
      console.log('TotemService.handleTotemLike - Initial totem state:', JSON.stringify(totem));
      console.log('TotemService.handleTotemLike - userId:', userId);
      console.log('TotemService.handleTotemLike - likedBy array:', JSON.stringify(totem.likedBy));
      
      // Initialize likedBy if it doesn't exist
      if (!totem.likedBy) {
        console.log('TotemService.handleTotemLike - likedBy array is undefined, initializing as empty array');
        totem.likedBy = [];
      }
      
      if (totem.likedBy.includes(userId)) {
        console.error('TotemService.handleTotemLike - User has already liked this totem');
        throw new Error("You've already liked this totem!");
      }

      const now = new Date().toISOString();
      const updatedAnswers = this.updateTotemStats(post.answers, answerIdx, totemName, userId, now);
      
      // Log the updated totem for debugging
      const updatedTotem = updatedAnswers[answerIdx].totems.find(t => t.name === totemName);
      console.log('TotemService.handleTotemLike - Updated totem state:', JSON.stringify(updatedTotem));
      console.log('TotemService.handleTotemLike - Updated likedBy array:', JSON.stringify(updatedTotem?.likedBy));
      
      // Update totem relationships based on similar answers
      const { groups } = SimilarityService.groupSimilarAnswers(updatedAnswers);
      const updatedTotems = SimilarityService.updateTotemRelationships(updatedAnswers, groups);
      
      // Update the post with new answers and totem relationships
      await updateDoc(doc(db, "posts", post.id), { 
        answers: this.updateTotemRelationships(updatedAnswers, updatedTotems),
        lastEngagement: Timestamp.now()
      });

      return updatedAnswers;
    } catch (error) {
      console.error('Error handling totem like:', error);
      throw error;
    }
  }

  /**
   * Update totem stats after a like
   */
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
            totems: ans.totems.map((t) => {
              if (t.name === totemName) {
                // Create a copy of the totem to avoid mutating the original
                const updatedTotem = { ...t };
                
                // Update the likes count
                updatedTotem.likes = (updatedTotem.likes || 0) + 1;
                
                // Update the lastLike timestamp
                updatedTotem.lastLike = timestamp;
                
                // Ensure arrays are initialized
                updatedTotem.likeTimes = updatedTotem.likeTimes || [];
                updatedTotem.likeValues = updatedTotem.likeValues || [];
                updatedTotem.likedBy = updatedTotem.likedBy || [];
                
                // Add the new like data
                updatedTotem.likeTimes = [...updatedTotem.likeTimes, timestamp];
                updatedTotem.likeValues = [...updatedTotem.likeValues, 1]; // Each like has a value of 1
                updatedTotem.likedBy = [...updatedTotem.likedBy, userId];
                
                // Calculate the new crispness based on all likes
                updatedTotem.crispness = this.calculateCrispness(
                  updatedTotem.likeValues,
                  updatedTotem.likeTimes,
                  updatedTotem.decayModel
                );
                
                console.log('TotemService.updateTotemStats - Updated totem:', {
                  name: updatedTotem.name,
                  likes: updatedTotem.likes,
                  likeTimes: updatedTotem.likeTimes.length,
                  likeValues: updatedTotem.likeValues.length,
                  likedBy: updatedTotem.likedBy.length,
                  crispness: updatedTotem.crispness
                });
                
                return updatedTotem;
              }
              return t;
            }),
          }
        : ans
    );
  }

  /**
   * Calculate the crispness of a totem based on its like history
   */
  static calculateCrispness(
    likes: number[],
    timestamps: string[],
    decayModel: keyof typeof DECAY_PERIODS = 'MEDIUM'
  ): number {
    console.log('TotemService.calculateCrispness - Starting calculation with:', {
      likesCount: likes.length,
      timestampsCount: timestamps.length,
      decayModel
    });
    
    // Validate input arrays
    if (likes.length !== timestamps.length) {
      console.error('TotemService.calculateCrispness - Mismatch between likes and timestamps arrays:', {
        likesLength: likes.length,
        timestampsLength: timestamps.length
      });
      // Use the shorter length to avoid index errors
      const minLength = Math.min(likes.length, timestamps.length);
      likes = likes.slice(0, minLength);
      timestamps = timestamps.slice(0, minLength);
    }
    
    if (likes.length === 0) {
      console.log('TotemService.calculateCrispness - No likes to calculate crispness from');
      return 0;
    }
    
    // If there's only one like, it's 100% crisp
    if (likes.length === 1) {
      console.log('TotemService.calculateCrispness - Only one like, returning 100% crispness');
      return 100;
    }
    
    const now = new Date().getTime();
    const decayPeriod = DECAY_PERIODS[decayModel];
    
    console.log('TotemService.calculateCrispness - Using decay period:', {
      decayPeriod,
      decayModel,
      currentTime: now
    });
    
    let totalWeight = 0;
    let weightedSum = 0;
    const debugWeights: Array<{timestamp: string, age: number, weight: number, value: number, contribution: number}> = [];

    timestamps.forEach((timestamp, index) => {
      const likeTime = new Date(timestamp).getTime();
      const timeSinceLike = now - likeTime;
      
      // Calculate weight based on how recent the like is
      // More recent likes have higher weights
      const weight = Math.max(0, 1 - (timeSinceLike / decayPeriod));
      const value = likes[index];
      const contribution = weight * value;
      
      weightedSum += contribution;
      totalWeight += weight;
      
      debugWeights.push({
        timestamp,
        age: Math.round(timeSinceLike / (1000 * 60 * 60 * 24)), // Age in days
        weight: parseFloat(weight.toFixed(4)),
        value,
        contribution: parseFloat(contribution.toFixed(4))
      });
    });
    
    console.log('TotemService.calculateCrispness - Weight calculations:', {
      debugWeights,
      totalWeight: parseFloat(totalWeight.toFixed(4)),
      weightedSum: parseFloat(weightedSum.toFixed(4))
    });

    // Calculate the weighted average
    // This ensures that more recent likes have a greater impact on the crispness
    const crispness = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
    
    // Ensure crispness is between 0 and 100
    const boundedCrispness = Math.min(100, Math.max(0, crispness));
    console.log('TotemService.calculateCrispness - Final crispness:', parseFloat(boundedCrispness.toFixed(2)));
    
    return boundedCrispness;
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
    const q = query(totemsRef, orderBy('usageCount', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    
    const allTotems = snapshot.docs.map(doc => ({
      name: doc.id,
      ...doc.data()
    })) as Totem[];

    return allTotems
      .filter(totem => !existingTotems.includes(totem.name))
      .map(totem => ({
        totemName: totem.name,
        confidence: this.calculateConfidence(text, totem),
        category: totem.category.name,
        reason: `Based on ${totem.usageCount} previous uses`
      }))
      .filter(suggestion => suggestion.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private static calculateConfidence(text: string, totem: Totem): number {
    const textLower = text.toLowerCase();
    const totemLower = totem.name.toLowerCase();
    
    // Simple exact match gives high confidence
    if (textLower.includes(totemLower)) {
      return 0.9;
    }
    
    // Base confidence on usage count
    return Math.min(0.7, totem.usageCount / 1000);
  }

  /**
   * Get answers that use specific totems
   */
  private static async getAnswersWithTotems(totemNames: string[]): Promise<Answer[]> {
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('answers.totems.name', 'array-contains-any', totemNames)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs
        .flatMap(doc => (doc.data() as Post).answers)
        .filter(answer => 
          answer.totems.some(totem => totemNames.includes(totem.name))
        );
    } catch (error) {
      console.error('Error fetching answers with totems:', error);
      return [];
    }
  }

  /**
   * Create a new totem
   */
  static async createTotem(
    name: string,
    category: TotemCategory,
    decayModel: keyof typeof DECAY_PERIODS = 'MEDIUM'
  ): Promise<Totem> {
    try {
      const totemRef = doc(db, 'totems', name);
      const totemDoc = await getDoc(totemRef);

      if (totemDoc.exists()) {
        throw new Error('Totem already exists');
      }

      const newTotem: Totem = {
        name,
        category,
        decayModel,
        likes: 0,
        usageCount: 0,
        likeTimes: [],
        likeValues: [],
        likedBy: [],
        crispness: 0,
        lastLike: undefined,
        relatedTotems: []
      };

      await setDoc(totemRef, newTotem);
      return newTotem;
    } catch (error) {
      console.error('Error creating totem:', error);
      throw error;
    }
  }

  static async getOrCreateCategory(categoryName: string): Promise<TotemCategory> {
    const categoriesRef = collection(db, 'totemCategories');
    const q = query(categoriesRef, where('name', '==', categoryName));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as TotemCategory;
    }

    const newCategory: TotemCategory = {
      id: crypto.randomUUID(),
      name: categoryName,
      description: `Category for ${categoryName} totems`,
      children: [],
      usageCount: 0
    };

    await addDoc(categoriesRef, newCategory);
    return newCategory;
  }
} 