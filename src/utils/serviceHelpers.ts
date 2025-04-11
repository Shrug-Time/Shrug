/**
 * Service Helper Utilities
 * 
 * This module provides helper functions for standardizing data access and operations
 * in service layers throughout the application.
 */

import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { validatePost, validateUserProfile, validateTotem } from './schemaValidation';
import { UserProfile, Post, Totem } from '@/types/models';
import { COMMON_FIELDS, USER_FIELDS, POST_FIELDS } from '@/constants/fields';

/**
 * Standard page size for all list queries
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Common error handler for service functions
 * @param operation Name of the operation that failed
 * @param error Error object
 * @throws Standardized error with operation context
 */
export function handleServiceError(operation: string, error: any): never {
  console.error(`Service error in ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message || 'Unknown error'}`);
}

/**
 * Creates a standardized timestamp object in milliseconds
 * @returns Current timestamp in milliseconds
 */
export function createTimestamp(): number {
  return Date.now();
}

/**
 * Standard method to get a user profile with validation
 * @param firebaseUid Firebase user ID
 * @returns Validated user profile or null if not found
 */
export async function getUserProfile(firebaseUid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', firebaseUid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return validateUserProfile({ 
      ...userDoc.data(),
      firebaseUid: userDoc.id // Ensure firebaseUid matches document ID
    });
  } catch (error) {
    handleServiceError('get user profile', error);
  }
}

/**
 * Standard method to get posts with pagination and filtering
 * @param constraints Query constraints to apply
 * @param pageSize Number of posts to return per page
 * @returns Validated posts and last document for pagination
 */
export async function getPaginatedPosts(
  constraints: QueryConstraint[] = [],
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<{ posts: Post[], lastVisible: any }> {
  try {
    const postsRef = collection(db, 'posts');
    const queryConstraints = [
      ...constraints,
      orderBy(COMMON_FIELDS.CREATED_AT, 'desc'),
      limit(pageSize)
    ];
    
    const q = query(postsRef, ...queryConstraints);
    const snapshot = await getDocs(q);
    
    const posts = snapshot.docs.map(doc => 
      validatePost({ id: doc.id, ...doc.data() })
    );
    
    return {
      posts,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]?.data()[COMMON_FIELDS.CREATED_AT]
    };
  } catch (error) {
    handleServiceError('get paginated posts', error);
  }
}

/**
 * Standard method to get a post by ID with validation
 * @param postId Post ID to retrieve
 * @returns Validated post or null if not found
 */
export async function getPost(postId: string): Promise<Post | null> {
  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return null;
    }
    
    return validatePost({ id: postDoc.id, ...postDoc.data() });
  } catch (error) {
    handleServiceError('get post', error);
  }
}

/**
 * Standard method to get posts where a user has answers
 * @param firebaseUid Firebase user ID
 * @param pageSize Number of posts to return
 * @returns Posts where the user has answers
 */
export async function getUserAnswers(
  firebaseUid: string,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<{ posts: Post[], lastVisible: any }> {
  try {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where(POST_FIELDS.ANSWER_FIREBASE_UIDS, 'array-contains', firebaseUid),
      orderBy(COMMON_FIELDS.CREATED_AT, 'desc'),
      limit(pageSize)
    );
    
    const snapshot = await getDocs(q);
    
    const posts = snapshot.docs.map(doc => 
      validatePost({ id: doc.id, ...doc.data() })
    );
    
    return {
      posts,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]?.data()[COMMON_FIELDS.CREATED_AT]
    };
  } catch (error) {
    handleServiceError('get user answers', error);
  }
}

/**
 * Standard method to get posts created by a user
 * @param firebaseUid Firebase user ID
 * @param pageSize Number of posts to return
 * @returns Posts created by the user
 */
export async function getUserPosts(
  firebaseUid: string,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<{ posts: Post[], lastVisible: any }> {
  try {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where(POST_FIELDS.FIREBASE_UID, '==', firebaseUid),
      orderBy(COMMON_FIELDS.CREATED_AT, 'desc'),
      limit(pageSize)
    );
    
    const snapshot = await getDocs(q);
    
    const posts = snapshot.docs.map(doc => 
      validatePost({ id: doc.id, ...doc.data() })
    );
    
    return {
      posts,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]?.data()[COMMON_FIELDS.CREATED_AT]
    };
  } catch (error) {
    handleServiceError('get user posts', error);
  }
} 