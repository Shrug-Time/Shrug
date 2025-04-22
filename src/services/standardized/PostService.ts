/**
 * Standardized Post Service
 * 
 * Provides standardized access to post data following the schema standards.
 * All post-related operations should go through this service to ensure consistency.
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
  QueryConstraint,
  startAfter,
  Firestore
} from 'firebase/firestore';
import { Post, Answer, UserProfile } from '@/types/models';
import { COMMON_FIELDS, POST_FIELDS, ANSWER_FIELDS } from '@/constants/fields';
import { validatePost, validateAnswer } from '@/utils/schemaValidation';
import { createTimestamp, DEFAULT_PAGE_SIZE } from '@/utils/serviceHelpers';
import { TransactionService } from '@/services/TransactionService';
import { CacheService } from '@/services/CacheService';
import { ErrorHandlingService } from '@/services/ErrorHandlingService';

// Cache TTL constants
const POST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const POST_LIST_CACHE_TTL = 60 * 1000; // 1 minute in milliseconds

/**
 * Gets a reference to the Firestore database with null check
 * @throws Error if Firestore is not initialized
 */
function getFirestore(): Firestore {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
}

/**
 * Service class for managing post data with standardized schema
 */
export class PostService {
  // Collection reference
  private static readonly POSTS_COLLECTION = 'posts';
  
  /**
   * Get paginated posts with optional filtering
   * @param constraints Additional query constraints
   * @param pageSize Number of posts per page
   * @param lastVisible Last visible document for pagination
   * @returns Paginated posts and pagination info
   */
  static async getPaginatedPosts(
    constraints: QueryConstraint[] = [],
    pageSize: number = DEFAULT_PAGE_SIZE,
    lastVisible: any = null
  ): Promise<{ posts: Post[], lastVisible: any }> {
    try {
      // Create cache key based on the query parameters
      const cacheKey = `posts_${JSON.stringify(constraints)}_${pageSize}_${lastVisible}`;
      
      // Try to get from cache first
      return await CacheService.getOrSet(
        cacheKey,
        async () => {
          const firestore = getFirestore();
          const postsRef = collection(firestore, this.POSTS_COLLECTION);
          let queryConstraints = [...constraints];
          
          // Add ordering constraint
          queryConstraints.push(orderBy(COMMON_FIELDS.CREATED_AT, 'desc'));
          
          // Add pagination constraints
          if (lastVisible) {
            queryConstraints.push(startAfter(lastVisible));
          }
          queryConstraints.push(limit(pageSize));
          
          // Execute query
          const q = query(postsRef, ...queryConstraints);
          const snapshot = await getDocs(q);
          
          // Process results
          const posts = snapshot.docs.map(doc => 
            validatePost({ id: doc.id, ...doc.data() })
          );
          
          return {
            posts,
            lastVisible: snapshot.docs.length > 0 
              ? snapshot.docs[snapshot.docs.length - 1] 
              : null
          };
        },
        POST_LIST_CACHE_TTL
      );
    } catch (error) {
      return ErrorHandlingService.handleServiceError('get paginated posts', error, { posts: [], lastVisible: null });
    }
  }
  
  /**
   * Get a post by ID
   * @param postId Post ID
   * @returns Post data or null if not found
   */
  static async getPost(postId: string): Promise<Post | null> {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      // Try to get from cache first
      const cacheKey = `post_${postId}`;
      
      return await CacheService.getOrSet(
        cacheKey,
        async () => {
          const firestore = getFirestore();
          const postRef = doc(firestore, this.POSTS_COLLECTION, postId);
          const postDoc = await getDoc(postRef);
          
          if (!postDoc.exists()) {
            return null;
          }
          
          return validatePost({ 
            id: postDoc.id, 
            ...postDoc.data() 
          });
        },
        POST_CACHE_TTL
      );
    } catch (error) {
      return ErrorHandlingService.handleServiceError('get post', error, null);
    }
  }
  
  /**
   * Create a new post
   * @param postData Post data
   * @returns Created post
   */
  static async createPost(postData: Partial<Post>): Promise<Post> {
    try {
      if (!postData.question) {
        throw new Error('Post question is required');
      }
      
      if (!postData.firebaseUid) {
        throw new Error('User ID is required');
      }
      
      // Generate a unique ID if not provided
      const postId = postData.id || `post_${Date.now()}_${postData.firebaseUid}`;
      const now = createTimestamp();
      const firestore = getFirestore();
      
      // Prepare post data with proper timestamps
      const newPostData: Partial<Post> = {
        ...postData,
        id: postId,
        [COMMON_FIELDS.CREATED_AT]: now,
        [COMMON_FIELDS.UPDATED_AT]: now,
        [COMMON_FIELDS.LAST_INTERACTION]: now,
        answers: postData.answers || []
      };
      
      // Use transaction for safety
      return await TransactionService.executeTransaction(
        'create post',
        async (transaction) => {
          const postRef = doc(firestore, this.POSTS_COLLECTION, postId);
          
          // Check if post already exists
          const existingPost = await TransactionService.getDocumentSafe(
            transaction,
            postRef,
            'create post'
          );
          
          if (existingPost) {
            throw new Error(`Post with ID ${postId} already exists`);
          }
          
          // Validate post data
          const validatedPost = validatePost(newPostData);
          
          // Create the post
          transaction.set(postRef, validatedPost);
          
          return validatedPost;
        }
      );
    } catch (error) {
      return ErrorHandlingService.handleServiceError('create post', error);
    }
  }
  
  /**
   * Add an answer to a post
   * @param postId Post ID
   * @param answerData Answer data
   * @returns Updated post with the new answer
   */
  static async addAnswer(postId: string, answerData: Partial<Answer>): Promise<Post> {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      if (!answerData.text) {
        throw new Error('Answer text is required');
      }
      
      if (!answerData.firebaseUid) {
        throw new Error('User ID is required');
      }
      
      const firestore = getFirestore();
      
      // Use transaction to ensure data consistency
      return await TransactionService.executeTransaction(
        'add answer',
        async (transaction) => {
          const postRef = doc(firestore, this.POSTS_COLLECTION, postId);
          const post = await TransactionService.getDocumentSafe<Post>(
            transaction,
            postRef,
            'add answer'
          );
          
          if (!post) {
            throw new Error('Post not found');
          }
          
          const now = createTimestamp();
          
          // Generate a unique ID for the answer
          const answerId = `${answerData.firebaseUid}_${now}`;
          
          // Prepare answer data with timestamps and ID
          const newAnswerData: Partial<Answer> = {
            ...answerData,
            id: answerId,
            [COMMON_FIELDS.CREATED_AT]: now,
            [COMMON_FIELDS.UPDATED_AT]: now,
            [COMMON_FIELDS.LAST_INTERACTION]: now
          };
          
          // Validate answer data
          const validatedAnswer = validateAnswer(newAnswerData);
          
          // Get existing answers
          const existingAnswers = post.answers || [];
          
          // Update arrays for quick lookup
          const answerFirebaseUids = [
            ...new Set([...post.answerFirebaseUids || [], validatedAnswer.firebaseUid])
          ];
          
          const answerUsernames = [
            ...new Set([...post.answerUsernames || [], validatedAnswer.username])
          ];
          
          // Add the new answer
          const updatedAnswers = [...existingAnswers, validatedAnswer];
          
          // Create update object with appropriate types - use Record<string, any> to avoid type errors with computed properties
          const updateData: Record<string, any> = {
            answers: updatedAnswers,
            answerFirebaseUids,
            answerUsernames,
            [COMMON_FIELDS.UPDATED_AT]: now,
            [COMMON_FIELDS.LAST_INTERACTION]: now
          };
          
          // Add answerCount field using computed property
          updateData[POST_FIELDS.ANSWER_COUNT] = updatedAnswers.length;
          
          // Update the post
          transaction.update(postRef, updateData);
          
          // Clear cache for this post
          CacheService.delete(`post_${postId}`);
          
          // Return the updated post
          return validatePost({
            ...post,
            id: postId,
            answers: updatedAnswers,
            answerFirebaseUids,
            answerUsernames,
            [POST_FIELDS.ANSWER_COUNT]: updatedAnswers.length,
            [COMMON_FIELDS.UPDATED_AT]: now,
            [COMMON_FIELDS.LAST_INTERACTION]: now
          });
        }
      );
    } catch (error) {
      return ErrorHandlingService.handleServiceError('add answer', error);
    }
  }
  
  /**
   * Get posts created by a specific user
   * @param firebaseUid User's Firebase UID
   * @param pageSize Number of posts per page
   * @param lastVisible Last visible document for pagination
   * @returns User's posts and pagination info
   */
  static async getUserPosts(
    firebaseUid: string,
    pageSize: number = DEFAULT_PAGE_SIZE,
    lastVisible: any = null
  ): Promise<{ posts: Post[], lastVisible: any }> {
    try {
      if (!firebaseUid) {
        throw new Error('User ID is required');
      }
      
      const constraints = [
        where(POST_FIELDS.FIREBASE_UID, '==', firebaseUid)
      ];
      
      return await this.getPaginatedPosts(constraints, pageSize, lastVisible);
    } catch (error) {
      return ErrorHandlingService.handleServiceError('get user posts', error, { posts: [], lastVisible: null });
    }
  }
  
  /**
   * Get posts where a user has provided answers
   * @param firebaseUid User's Firebase UID
   * @param pageSize Number of posts per page
   * @param lastVisible Last visible document for pagination
   * @returns Posts with user's answers and pagination info
   */
  static async getUserAnswers(
    firebaseUid: string,
    pageSize: number = DEFAULT_PAGE_SIZE,
    lastVisible: any = null
  ): Promise<{ posts: Post[], lastVisible: any }> {
    try {
      if (!firebaseUid) {
        throw new Error('User ID is required');
      }
      
      const constraints = [
        where(POST_FIELDS.ANSWER_FIREBASE_UIDS, 'array-contains', firebaseUid)
      ];
      
      return await this.getPaginatedPosts(constraints, pageSize, lastVisible);
    } catch (error) {
      return ErrorHandlingService.handleServiceError('get user answers', error, { posts: [], lastVisible: null });
    }
  }
  
  /**
   * Update a post's score
   * @param postId Post ID
   * @param newScore New score value
   * @returns Success status
   */
  static async updatePostScore(postId: string, newScore: number): Promise<boolean> {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      const firestore = getFirestore();
      
      return await TransactionService.executeTransaction(
        'update post score',
        async (transaction) => {
          const postRef = doc(firestore, this.POSTS_COLLECTION, postId);
          const post = await TransactionService.getDocumentSafe<Post>(
            transaction,
            postRef,
            'update post score'
          );
          
          if (!post) {
            throw new Error('Post not found');
          }
          
          const now = createTimestamp();
          
          transaction.update(postRef, {
            score: newScore,
            [COMMON_FIELDS.UPDATED_AT]: now,
            [COMMON_FIELDS.LAST_INTERACTION]: now
          });
          
          // Clear cache for this post
          CacheService.delete(`post_${postId}`);
          
          return true;
        }
      );
    } catch (error) {
      return ErrorHandlingService.handleServiceError('update post score', error, false);
    }
  }
  
  /**
   * Search posts by content
   * @param searchTerm Search term
   * @param pageSize Number of posts per page
   * @returns Matching posts
   */
  static async searchPosts(
    searchTerm: string,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<Post[]> {
    try {
      if (!searchTerm?.trim()) {
        return [];
      }
      
      const cacheKey = `search_posts_${searchTerm}_${pageSize}`;
      
      return await CacheService.getOrSet(
        cacheKey,
        async () => {
          const searchTermLower = searchTerm.toLowerCase().trim();
          const firestore = getFirestore();
          
          const postsRef = collection(firestore, this.POSTS_COLLECTION);
          const q = query(
            postsRef,
            orderBy(COMMON_FIELDS.CREATED_AT, 'desc'),
            limit(100) // Get more to filter client-side
          );
          
          const snapshot = await getDocs(q);
          
          const posts = snapshot.docs.map(doc => 
            validatePost({ id: doc.id, ...doc.data() })
          );
          
          // Client-side filtering
          const matchingPosts = posts.filter(post => 
            post.question.toLowerCase().includes(searchTermLower) ||
            post.answers.some(answer => answer.text.toLowerCase().includes(searchTermLower))
          );
          
          return matchingPosts.slice(0, pageSize);
        },
        POST_LIST_CACHE_TTL
      );
    } catch (error) {
      return ErrorHandlingService.handleServiceError('search posts', error, []);
    }
  }
  
  /**
   * Delete a post with transaction safety
   */
  static async deletePost(postId: string): Promise<boolean> {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      const firestore = getFirestore();
      
      return await TransactionService.executeTransaction(
        'delete post',
        async (transaction) => {
          const postRef = doc(firestore, this.POSTS_COLLECTION, postId);
          
          // Check if post exists before deleting
          const post = await TransactionService.getDocumentSafe<Post>(
            transaction,
            postRef,
            'delete post'
          );
          
          if (!post) {
            throw new Error('Post not found');
          }
          
          // Delete the post
          transaction.delete(postRef);
          
          // Clear cache for this post
          CacheService.delete(`post_${postId}`);
          // Clear any list caches that might contain this post
          CacheService.clearPattern(/^posts_/);
          
          return true;
        }
      );
    } catch (error) {
      return ErrorHandlingService.handleServiceError('delete post', error, false);
    }
  }
} 