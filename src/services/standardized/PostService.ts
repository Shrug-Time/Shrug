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
  QueryConstraint
} from 'firebase/firestore';
import { Post, Answer, UserProfile } from '@/types/models';
import { COMMON_FIELDS, POST_FIELDS, ANSWER_FIELDS } from '@/constants/fields';
import { validatePost, validateAnswer } from '@/utils/schemaValidation';
import { handleServiceError, createTimestamp, DEFAULT_PAGE_SIZE } from '@/utils/serviceHelpers';

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
      const postsRef = collection(db, this.POSTS_COLLECTION);
      const queryConstraints = [
        ...constraints,
        orderBy(COMMON_FIELDS.CREATED_AT, 'desc'),
        limit(pageSize)
      ];
      
      // Add pagination constraint if lastVisible is provided
      if (lastVisible) {
        queryConstraints.push(where(COMMON_FIELDS.CREATED_AT, '<', lastVisible));
      }
      
      const q = query(postsRef, ...queryConstraints);
      const snapshot = await getDocs(q);
      
      // Validate posts data using our schema validation
      const posts = snapshot.docs.map(doc => 
        validatePost({ id: doc.id, ...doc.data() })
      );
      
      return {
        posts,
        lastVisible: snapshot.docs.length > 0 
          ? snapshot.docs[snapshot.docs.length - 1].data()[COMMON_FIELDS.CREATED_AT] 
          : null
      };
    } catch (error) {
      handleServiceError('get paginated posts', error);
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
      
      const postRef = doc(db, this.POSTS_COLLECTION, postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        return null;
      }
      
      // Validate post data using our schema validation
      return validatePost({ id: postDoc.id, ...postDoc.data() });
    } catch (error) {
      handleServiceError('get post', error);
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
        throw new Error('Question is required');
      }
      
      if (!postData.firebaseUid) {
        throw new Error('User ID is required');
      }
      
      const postsRef = collection(db, this.POSTS_COLLECTION);
      const postDoc = doc(postsRef);
      const now = createTimestamp();
      
      // Prepare post data with timestamps and ID
      const newPostData: Partial<Post> = {
        ...postData,
        id: postDoc.id,
        answers: [],
        answerFirebaseUids: [],
        answerUsernames: [],
        [COMMON_FIELDS.CREATED_AT]: now,
        [COMMON_FIELDS.UPDATED_AT]: now,
        [COMMON_FIELDS.LAST_INTERACTION]: now
      };
      
      // Validate data before saving
      const validatedData = validatePost(newPostData);
      
      // Save to database
      await setDoc(postDoc, validatedData);
      
      return validatedData;
    } catch (error) {
      handleServiceError('create post', error);
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
      
      // Use transaction to ensure data consistency
      return await runTransaction(db, async (transaction) => {
        const postRef = doc(db, this.POSTS_COLLECTION, postId);
        const postDoc = await transaction.get(postRef);
        
        if (!postDoc.exists()) {
          throw new Error('Post not found');
        }
        
        const post = postDoc.data() as Post;
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
        
        // Update the post with the new answer
        transaction.update(postRef, {
          answers: updatedAnswers,
          answerFirebaseUids,
          answerUsernames,
          [POST_FIELDS.ANSWER_COUNT]: updatedAnswers.length,
          [COMMON_FIELDS.UPDATED_AT]: now,
          [COMMON_FIELDS.LAST_INTERACTION]: now
        });
        
        // Return the updated post
        return validatePost({
          ...post,
          id: postDoc.id,
          answers: updatedAnswers,
          answerFirebaseUids,
          answerUsernames,
          [COMMON_FIELDS.UPDATED_AT]: now,
          [COMMON_FIELDS.LAST_INTERACTION]: now
        });
      });
    } catch (error) {
      handleServiceError('add answer', error);
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
      handleServiceError('get user posts', error);
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
      handleServiceError('get user answers', error);
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
      
      const postRef = doc(db, this.POSTS_COLLECTION, postId);
      const now = createTimestamp();
      
      await updateDoc(postRef, {
        score: newScore,
        [COMMON_FIELDS.UPDATED_AT]: now,
        [COMMON_FIELDS.LAST_INTERACTION]: now
      });
      
      return true;
    } catch (error) {
      handleServiceError('update post score', error);
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
      // Note: Firestore doesn't support full-text search natively
      // This is a simple implementation searching by exact match
      // For production, consider using Algolia, Elasticsearch, or Firebase Extensions
      
      if (!searchTerm?.trim()) {
        return [];
      }
      
      const searchTermLower = searchTerm.toLowerCase().trim();
      
      const postsRef = collection(db, this.POSTS_COLLECTION);
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
    } catch (error) {
      handleServiceError('search posts', error);
      return [];
    }
  }
} 