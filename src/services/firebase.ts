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
  documentId,
  startAfter,
  runTransaction
} from 'firebase/firestore';
import type { Post, UserProfile, Answer, TotemAssociation, Totem, TotemLike } from '@/types/models';
import { COMMON_FIELDS, USER_FIELDS, POST_FIELDS, ANSWER_FIELDS, TOTEM_ASSOCIATION_FIELDS } from '@/constants/fields';
import { TotemService } from '@/services/totem';

const POSTS_PER_PAGE = 20;

export const PostService = {
  async getPaginatedPosts(
    lastVisible: any = null,
    filters: QueryConstraint[] = []
  ) {
    try {
      const postsRef = collection(db, 'posts');
      let constraints: QueryConstraint[] = [
        orderBy(COMMON_FIELDS.CREATED_AT, 'desc'),
        limit(POSTS_PER_PAGE)
      ];

      if (filters.length > 0) {
        constraints = [...filters, ...constraints];
      }

      if (lastVisible) {
        constraints.push(where(COMMON_FIELDS.CREATED_AT, '<', lastVisible));
      }

      const q = query(postsRef, ...constraints);
      const snapshot = await getDocs(q);
      
      return {
        posts: snapshot.docs.map(doc => this.standardizePostData({ id: doc.id, ...doc.data() })),
        lastVisible: snapshot.docs[snapshot.docs.length - 1]?.data()[COMMON_FIELDS.CREATED_AT]
      };
    } catch (error) {
      console.error('Error fetching paginated posts:', error);
      throw error;
    }
  },

  async getUserAnswers(userID: string, lastVisible: any = null) {
    try {
      const postsRef = collection(db, 'posts');
      
      // Use standardized field names but maintain backward compatibility
      const constraints: QueryConstraint[] = [
        // This query needs to be updated when we have fully migrated to the new schema
        // Currently using the legacy array-contains which isn't optimal
        where('answers', 'array-contains', { userID }),
        orderBy(COMMON_FIELDS.CREATED_AT, 'desc'),
        limit(POSTS_PER_PAGE)
      ];

      if (lastVisible) {
        constraints.push(where(COMMON_FIELDS.CREATED_AT, '<', lastVisible));
      }

      const q = query(postsRef, ...constraints);
      const snapshot = await getDocs(q);

      return {
        posts: snapshot.docs.map(doc => this.standardizePostData({ id: doc.id, ...doc.data() })),
        lastVisible: snapshot.docs[snapshot.docs.length - 1]?.data()[COMMON_FIELDS.CREATED_AT]
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
        lastScoreUpdate: Timestamp.now(),
        [COMMON_FIELDS.UPDATED_AT]: Date.now(),
        [COMMON_FIELDS.LAST_INTERACTION]: Date.now()
      });
    } catch (error) {
      console.error('Error updating post score:', error);
      throw error;
    }
  },

  async getUserPosts(userID: string) {
    try {
      console.log('🔍 USING UPDATED VERSION OF getUserPosts - STANDARDIZED FIELDS');
      console.log(`[getUserPosts] Starting to fetch posts for user ${userID}`);
      
      // Create a batch of promises to run in parallel for better performance
      const postsRef = collection(db, 'posts');
      
      // TELEMETRY: Track which query paths are being used
      const telemetry = {
        standardizedQuery: { attempted: true, succeeded: false, count: 0 }
      };
      
      // Query posts where user is the author using standardized fields
      const authorQuery = query(
        postsRef,
        where(USER_FIELDS.FIREBASE_UID, '==', userID),
        orderBy(COMMON_FIELDS.LAST_INTERACTION, 'desc')
      );
      
      // Fallback to legacy userId field if needed during transition
      const legacyAuthorQuery = query(
        postsRef,
        where(USER_FIELDS.LEGACY_USER_ID, '==', userID),
        orderBy(COMMON_FIELDS.LAST_INTERACTION, 'desc')
      );
      
      // Use standardized answerUserIds field to find posts user has answered
      const answersQuery = query(
        postsRef,
        where(POST_FIELDS.ANSWER_USER_IDS, 'array-contains', userID),
        orderBy(COMMON_FIELDS.LAST_INTERACTION, 'desc')
      );
      
      console.log(`[getUserPosts] Executing queries in parallel`);
      
      // Execute queries in parallel for better performance
      const queryPromises = [
        // Standardized author query
        getDocs(authorQuery).catch(err => {
          console.error(`[getUserPosts] Error in standardized author query:`, err);
          return { docs: [] };
        }),
        
        // Legacy author query
        getDocs(legacyAuthorQuery).catch(err => {
          console.error(`[getUserPosts] Error in legacy author query:`, err);
          return { docs: [] };
        }),
        
        // Answers query
        getDocs(answersQuery).catch(err => {
          console.error('[getUserPosts] Error in answers query:', err);
          return { docs: [] };
        })
      ];
      
      const queryResults = await Promise.all(queryPromises);
      
      // Process the results
      console.log(`[getUserPosts] Processing query results`);
      
      // Extract results from each query
      const [
        authorQuerySnapshot,
        legacyAuthorQuerySnapshot,
        answersQuerySnapshot
      ] = queryResults;
      
      // Track telemetry
      telemetry.standardizedQuery.count = authorQuerySnapshot.docs.length + answersQuerySnapshot.docs.length;
      telemetry.standardizedQuery.succeeded = telemetry.standardizedQuery.count > 0;
      
      // Process author posts
      const createdPosts: Post[] = [];
      
      // Add posts from standardized author query
      authorQuerySnapshot.docs.forEach(doc => {
        const postData = doc.data();
        createdPosts.push(this.standardizePostData({
          id: doc.id,
          ...postData
        }));
      });
      
      // Add posts from legacy author query
      legacyAuthorQuerySnapshot.docs.forEach(doc => {
        const postData = doc.data();
        createdPosts.push(this.standardizePostData({
          id: doc.id,
          ...postData
        }));
      });
      
      // Process answered posts
      const answeredPosts: Post[] = [];
      
      // Add posts from answers query
      answersQuerySnapshot.docs.forEach(doc => {
        const postData = doc.data();
        answeredPosts.push(this.standardizePostData({
          id: doc.id,
          ...postData
        }));
      });
      
      // Combine all posts and remove duplicates
      const allPosts = [...createdPosts, ...answeredPosts];
      const uniquePostIds = new Set<string>();
      const uniquePosts = allPosts.filter(post => {
        if (uniquePostIds.has(post.id)) {
          return false;
        }
        uniquePostIds.add(post.id);
        return true;
      });
      
      console.log(`[getUserPosts] Total posts found: ${uniquePosts.length} (${createdPosts.length} created, ${answeredPosts.length} answered)`);
      
      return uniquePosts;
    } catch (error) {
      console.error('[getUserPosts] Error fetching user posts:', error);
      throw error;
    }
  },
  
  // Update posts with the standardized answerUserIds field
  async updatePostsWithAnswerUserIds(posts: Post[]) {
    try {
      for (const post of posts) {
        // Extract unique user IDs from answers
        const answerUserIds = [...new Set(
          (post.answers || [])
            .map(answer => answer.userId || answer.firebaseUid)
            .filter(Boolean)
        )];
        
        // Update the post document
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, { 
          [POST_FIELDS.ANSWER_USER_IDS]: answerUserIds,
          [COMMON_FIELDS.UPDATED_AT]: Date.now()
        });
        
        console.log(`[updatePostsWithAnswerUserIds] Updated post ${post.id} with answerUserIds field`);
      }
    } catch (error) {
      console.error('[updatePostsWithAnswerUserIds] Error updating posts:', error);
      // Don't throw - this is a background operation
    }
  },

  async createAnswer(postId: string, answer: Omit<Answer, 'createdAt' | 'id'>) {
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        throw new Error('Post not found');
      }

      const post = postDoc.data() as Post;
      const now = Date.now();
      
      // Create a standardized answer with both new and legacy fields
      const newAnswer: Answer = {
        ...answer,
        id: `${answer.firebaseUid || answer.userId}_${now}`, // Generate a unique ID for the answer
        createdAt: now,
        updatedAt: now,
        lastInteraction: now,
        
        // Ensure both new and legacy fields are set
        firebaseUid: answer.firebaseUid || answer.userId || '',
        userId: answer.userId || answer.firebaseUid || '',
        name: answer.name || answer.userName || '',
        userName: answer.userName || answer.name || ''
      };

      // Get existing answerUserIds or initialize as empty array
      const existingAnswerUserIds = post[POST_FIELDS.ANSWER_USER_IDS] || [];
      
      // Add the new user ID if it's not already in the array
      const updatedAnswerUserIds = existingAnswerUserIds.includes(newAnswer.firebaseUid)
        ? existingAnswerUserIds
        : [...existingAnswerUserIds, newAnswer.firebaseUid];

      // Get existing answers or initialize as empty array
      const existingAnswers = post.answers || [];
      
      // Add the new answer
      const updatedAnswers = [...existingAnswers, newAnswer];
      
      // Update the post with the new answer and metadata
      await updateDoc(postRef, {
        answers: updatedAnswers,
        [POST_FIELDS.ANSWER_USER_IDS]: updatedAnswerUserIds,
        [POST_FIELDS.ANSWER_COUNT]: updatedAnswers.length,
        [COMMON_FIELDS.UPDATED_AT]: now,
        [COMMON_FIELDS.LAST_INTERACTION]: now
      });
      
      return { 
        success: true, 
        newAnswer,
        updatedPost: {
          ...post,
          id: postId,
          answers: updatedAnswers,
          [POST_FIELDS.ANSWER_USER_IDS]: updatedAnswerUserIds,
          [POST_FIELDS.ANSWER_COUNT]: updatedAnswers.length,
          [COMMON_FIELDS.UPDATED_AT]: now,
          [COMMON_FIELDS.LAST_INTERACTION]: now
        }
      };
    } catch (error) {
      console.error('Error creating answer:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Standardizes post data to ensure all fields are in the expected format
   * @param postData Raw post data from Firestore
   * @returns Standardized Post object
   */
  standardizePostData(postData: Record<string, any>): Post {
    // Handle timestamps
    const now = Date.now();
    let createdAt = postData.createdAt;
    
    // Convert string timestamps to numbers
    if (typeof createdAt === 'string') {
      createdAt = new Date(createdAt).getTime();
    }
    // Convert Firestore timestamps to numbers
    else if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt) {
      createdAt = createdAt.seconds * 1000;
    }
    
    // Process totem associations
    const totemAssociations: TotemAssociation[] = [];
    
    // Convert legacy totems array to structured associations if needed
    if (Array.isArray(postData.totems)) {
      postData.totems.forEach((totem: string) => {
        totemAssociations.push({
          totemId: totem, // Use totem name as ID for backward compatibility
          totemName: totem,
          relevanceScore: 1.0,
          appliedBy: postData.firebaseUid || postData.userId || '',
          appliedAt: createdAt || now,
          endorsedBy: [],
          contestedBy: []
        });
      });
    }
    
    // Include existing structured associations
    if (Array.isArray(postData.totemAssociations)) {
      // Deduplicate by totem name
      const existingTotemNames = new Set(totemAssociations.map(t => t.totemName));
      
      postData.totemAssociations.forEach((assoc: TotemAssociation) => {
        if (!existingTotemNames.has(assoc.totemName)) {
          totemAssociations.push(assoc);
          existingTotemNames.add(assoc.totemName);
        }
      });
    }
    
    // Ensure answers are standardized
    const standardizedAnswers = (postData.answers || []).map((answer: Record<string, any>): Answer => {
      const answerCreatedAt = typeof answer.createdAt === 'object' && 'seconds' in answer.createdAt 
        ? answer.createdAt.seconds * 1000 
        : (answer.createdAt || now);
        
      return {
        id: answer.id || `${answer.userId || answer.firebaseUid}_${answerCreatedAt}`,
        text: answer.text || '',
        firebaseUid: answer.firebaseUid || answer.userId || '',
        username: answer.username || answer.userID || '',
        name: answer.name || answer.userName || '',
        createdAt: answerCreatedAt,
        updatedAt: answer.updatedAt || answerCreatedAt,
        lastInteraction: answer.lastInteraction || answerCreatedAt,
        totems: answer.totems || []
      };
    });
    
    // Type predicate to ensure string values
    const isNonEmptyString = (value: unknown): value is string => 
      typeof value === 'string' && value.length > 0;
    
    // Get unique answer user IDs and usernames
    const answerFirebaseUids = [...new Set(
      standardizedAnswers
        .map((answer: Answer) => answer.firebaseUid)
        .filter(isNonEmptyString)
    )] as string[];
    
    const answerUsernames = [...new Set(
      standardizedAnswers
        .map((answer: Answer) => answer.username)
        .filter(isNonEmptyString)
    )] as string[];
    
    // Return the standardized post
    return {
      id: postData.id || '',
      firebaseUid: postData.firebaseUid || postData.userId || '',
      username: postData.username || postData.userID || '',
      name: postData.name || postData.userName || '',
      
      // Post content - handle both text and question fields
      question: postData.question || postData.text || '',
      text: postData.text || postData.question || '',
      
      // Content categorization
      categories: postData.categories || [],
      
      // Enhanced totem connection
      totemAssociations,
      
      // Engagement metrics
      score: postData.score,
      
      // Answers
      answers: standardizedAnswers,
      answerFirebaseUids,
      answerUsernames,
      
      // Timestamps
      createdAt: createdAt || now,
      updatedAt: postData.updatedAt || createdAt || now,
      lastInteraction: postData.lastInteraction || postData.lastEngagement || createdAt || now,
      
      // Legacy fields for backward compatibility
      userId: postData.userId || postData.firebaseUid || '',
      userName: postData.userName || postData.name || '',
      answerUserIds: answerFirebaseUids
    };
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
          if (userId) {
            await trackUserAnswer(userId, postId);
          }
        }
      }
      
      console.log('Successfully migrated answers to userAnswers collection');
    } catch (error) {
      console.error('Error migrating answers:', error);
      throw error;
    }
  },

  // New method to check the structure of a post document
  async checkPostStructure(postId: string) {
    try {
      console.log(`[checkPostStructure] Checking structure of post ${postId}`);
      
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.error(`[checkPostStructure] Post ${postId} not found`);
        return { exists: false };
      }
      
      const data = postDoc.data();
      
      // Check the structure of the post
      const structure = {
        id: postId,
        hasUserId: !!data.userId,
        userId: data.userId,
        hasQuestion: !!data.question,
        hasAnswers: Array.isArray(data.answers),
        answersCount: Array.isArray(data.answers) ? data.answers.length : 0,
        hasAnswerUserIds: Array.isArray(data.answerUserIds),
        answerUserIdsCount: Array.isArray(data.answerUserIds) ? data.answerUserIds.length : 0,
        createdAt: data.createdAt,
        lastEngagement: data.lastEngagement
      };
      
      console.log(`[checkPostStructure] Post structure:`, structure);
      
      // Check the structure of the first answer if available
      if (Array.isArray(data.answers) && data.answers.length > 0) {
        const firstAnswer = data.answers[0];
        const answerStructure = {
          hasText: !!firstAnswer.text,
          hasUserId: !!firstAnswer.userId,
          userId: firstAnswer.userId,
          hasUserName: !!firstAnswer.userName,
          hasTotems: Array.isArray(firstAnswer.totems),
          totemsCount: Array.isArray(firstAnswer.totems) ? firstAnswer.totems.length : 0
        };
        
        console.log(`[checkPostStructure] First answer structure:`, answerStructure);
      }
      
      return { exists: true, structure };
    } catch (error) {
      console.error(`[checkPostStructure] Error checking post structure:`, error);
      return { exists: false, error };
    }
  },

  async getPost(postId: string): Promise<Post | null> {
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) return null;
      return this.standardizePostData({ id: postDoc.id, ...postDoc.data() });
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  },

  async getPosts(orderByField: 'createdAt' | 'lastInteraction', pageSize = 10, lastDoc?: any): Promise<{ items: Post[]; lastDoc: any }> {
    try {
      let q = query(collection(db, "posts"), orderBy(orderByField, 'desc'), limit(pageSize));
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
      
      return {
        items: items.map(post => ({
          ...post,
          answers: post.answers.map(answer => ({
            ...answer,
            totems: answer.totems.map(totem => ({
              ...totem,
              likeHistory: totem.likeHistory || [],
              crispness: TotemService.calculateCrispnessFromLikeHistory(totem.likeHistory || [])
            }))
          }))
        })),
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error getting posts:', error);
      throw error;
    }
  },
};

export class UserService {
  static async getUserProfile(userID: string): Promise<UserProfile | null> {
    try {
      console.log('[UserService.getUserProfile] Fetching profile for user:', userID);
      
      const userRef = doc(db, 'users', userID);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('[UserService.getUserProfile] Found user profile:', {
          userID: userData.userID,
          name: userData.name,
          email: userData.email?.substring(0, 3) + '***',
          membershipTier: userData.membershipTier
        });
        return userData as UserProfile;
      }
      
      console.log('[UserService.getUserProfile] No user profile found for:', userID);
      return null;
    } catch (error) {
      console.error('[UserService.getUserProfile] Error fetching user profile:', error);
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

// Helper function to check if a user has liked a totem
const hasUserLiked = (totem: Totem, userId: string): boolean => {
  return totem.likeHistory?.some(like => like.userId === userId && like.isActive) || false;
};

// Helper functions for totem operations
function findAnswerWithTotem(answers: Answer[], totemName: string): Answer {
  const answer = answers.find(a => 
    a.totems.some(t => t.name === totemName)
  );
  if (!answer) {
    throw new Error("Answer with totem not found");
  }
  return answer;
}

function findTotemInAnswer(answer: Answer, totemName: string): Totem {
  const totem = answer.totems.find(t => t.name === totemName);
  if (!totem) {
    throw new Error("Totem not found in answer");
  }
  return totem;
} 