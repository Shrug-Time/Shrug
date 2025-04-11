/**
 * Schema Validation Utilities
 * 
 * This module provides validation functions for ensuring data consistency according to
 * the defined schema standards. It validates entities against their expected structure
 * and normalizes data formats.
 */

import type { UserProfile, Post, Answer, Totem, TotemAssociation, TotemLike } from '@/types/models';
import { COMMON_FIELDS, USER_FIELDS, POST_FIELDS, ANSWER_FIELDS } from '@/constants/fields';

/**
 * Validates and converts timestamps to numeric milliseconds format
 * @param timestamp Timestamp value to normalize
 * @param defaultValue Default value if timestamp is invalid
 * @returns Normalized timestamp in milliseconds
 */
export function normalizeTimestamp(timestamp: any, defaultValue: number = Date.now()): number {
  if (timestamp === null || timestamp === undefined) {
    return defaultValue;
  }
  
  // Already a number
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  // String date
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  // Firestore Timestamp { seconds, nanoseconds }
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds ? Math.floor(timestamp.nanoseconds / 1000000) : 0);
  }
  
  // JavaScript Date object
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  
  return defaultValue;
}

/**
 * Validates and normalizes a string field
 * @param value String value to normalize
 * @param defaultValue Default value if string is invalid
 * @returns Normalized string (trimmed)
 */
export function normalizeString(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  return String(value).trim();
}

/**
 * Validates a required field
 * @param value The value to check
 * @param fieldName Name of the field for error message
 * @throws Error if the value is missing
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`${fieldName} is required`);
  }
}

/**
 * Validates an array field
 * @param array Array to validate
 * @param defaultValue Default value if array is invalid
 * @returns Normalized array with no null or undefined values
 */
export function normalizeArray<T>(array: any, defaultValue: T[] = []): T[] {
  if (!Array.isArray(array)) {
    return defaultValue;
  }
  
  return array.filter(item => item !== null && item !== undefined);
}

/**
 * Validates and normalizes a UserProfile object
 * @param profile User profile data to validate
 * @returns Normalized UserProfile
 */
export function validateUserProfile(profile: Partial<UserProfile>): UserProfile {
  // Validate required fields
  validateRequired(profile.firebaseUid, 'firebaseUid');
  
  const now = Date.now();
  
  // Build normalized profile
  return {
    // Core identity fields
    firebaseUid: normalizeString(profile.firebaseUid),
    username: normalizeString(profile.username),
    name: normalizeString(profile.name),
    
    // Profile content
    email: normalizeString(profile.email),
    bio: profile.bio ? normalizeString(profile.bio) : undefined,
    photoURL: profile.photoURL ? normalizeString(profile.photoURL) : undefined,
    
    // Status fields
    verificationStatus: profile.verificationStatus || 'unverified',
    membershipTier: profile.membershipTier || 'free',
    
    // Usage limits
    refreshesRemaining: typeof profile.refreshesRemaining === 'number' ? profile.refreshesRemaining : 0,
    refreshResetTime: normalizeString(profile.refreshResetTime),
    
    // Social connections
    followers: normalizeArray<string>(profile.followers, []),
    following: normalizeArray<string>(profile.following, []),
    
    // Totem relationships
    totems: {
      created: normalizeArray<string>(profile.totems?.created, []),
      frequently_used: normalizeArray<string>(profile.totems?.frequently_used, []),
      recent: normalizeArray<string>(profile.totems?.recent, []),
    },
    
    // Expertise
    expertise: normalizeArray(profile.expertise, []),
    
    // Timestamps
    createdAt: normalizeTimestamp(profile.createdAt, now),
    updatedAt: normalizeTimestamp(profile.updatedAt, now),
    lastInteraction: normalizeTimestamp(profile.lastInteraction, now),
  };
}

/**
 * Validates and normalizes a Post object
 * @param post Post data to validate
 * @returns Normalized Post
 */
export function validatePost(post: Partial<Post>): Post {
  // Validate required fields
  validateRequired(post.id, 'id');
  validateRequired(post.question || post.text, 'question');
  
  const now = Date.now();
  
  // Normalize answers
  const normalizedAnswers = normalizeArray(post.answers).map(answer => 
    validateAnswer(answer as Partial<Answer>)
  );
  
  // Extract user IDs from answers
  const answerFirebaseUids = [...new Set(
    normalizedAnswers.map(answer => answer.firebaseUid)
      .filter(id => id && id.trim() !== '')
  )];
  
  const answerUsernames = [...new Set(
    normalizedAnswers.map(answer => answer.username)
      .filter(name => name && name.trim() !== '')
  )];
  
  // Build normalized post
  return {
    id: normalizeString(post.id),
    question: normalizeString(post.question || post.text),
    
    // Standardized user fields
    firebaseUid: normalizeString(post.firebaseUid || post.userId),
    username: normalizeString(post.username),
    name: normalizeString(post.name || post.userName),
    
    // Content categorization
    categories: normalizeArray<string>(post.categories, []),
    
    // Totem associations
    totemAssociations: normalizeArray<TotemAssociation>(post.totemAssociations, []),
    
    // Engagement metrics
    score: post.score,
    
    // Answers
    answers: normalizedAnswers,
    answerFirebaseUids,
    answerUsernames,
    
    // Timestamps
    createdAt: normalizeTimestamp(post.createdAt, now),
    updatedAt: normalizeTimestamp(post.updatedAt, now),
    lastInteraction: normalizeTimestamp(post.lastInteraction, now),
    
    // Legacy fields
    userId: normalizeString(post.userId),
    userName: normalizeString(post.userName),
    answerUserIds: answerFirebaseUids,
    text: normalizeString(post.text || post.question),
  };
}

/**
 * Validates and normalizes an Answer object
 * @param answer Answer data to validate
 * @returns Normalized Answer
 */
export function validateAnswer(answer: Partial<Answer>): Answer {
  // Generate ID if not provided
  const id = answer.id || `${answer.firebaseUid || answer.userId}_${Date.now()}`;
  
  const now = Date.now();
  
  // Build normalized answer
  return {
    id,
    text: normalizeString(answer.text),
    
    // Standardized user fields
    firebaseUid: normalizeString(answer.firebaseUid || answer.userId),
    username: normalizeString(answer.username),
    name: normalizeString(answer.name || answer.userName),
    
    // Associated totems
    totems: normalizeArray(answer.totems, []),
    
    // Status indicators
    isVerified: answer.isVerified,
    isPremium: answer.isPremium,
    
    // Timestamps
    createdAt: normalizeTimestamp(answer.createdAt, now),
    updatedAt: normalizeTimestamp(answer.updatedAt, now),
    lastInteraction: normalizeTimestamp(answer.lastInteraction, now),
    
    // Legacy fields
    userId: normalizeString(answer.userId),
    userName: normalizeString(answer.userName),
  };
}

/**
 * Validates and normalizes a Totem object
 * @param totem Totem data to validate
 * @returns Normalized Totem
 */
export function validateTotem(totem: Partial<Totem>): Totem {
  // Validate required fields
  validateRequired(totem.id, 'id');
  validateRequired(totem.name, 'name');
  
  const now = Date.now();
  
  // Normalize like history
  const normalizedLikeHistory = normalizeArray<TotemLike>(totem.likeHistory).map(like => ({
    userId: normalizeString(like.userId),
    originalTimestamp: normalizeTimestamp(like.originalTimestamp, now),
    lastUpdatedAt: normalizeTimestamp(like.lastUpdatedAt, now),
    isActive: like.isActive ?? false,
    value: like.value ?? 1,
  }));
  
  // Build normalized totem
  return {
    id: normalizeString(totem.id),
    name: normalizeString(totem.name),
    description: totem.description ? normalizeString(totem.description) : undefined,
    imageUrl: totem.imageUrl ? normalizeString(totem.imageUrl) : undefined,
    
    likeHistory: normalizedLikeHistory,
    crispness: typeof totem.crispness === 'number' ? totem.crispness : 100,
    category: totem.category || {
      id: 'general',
      name: 'General',
      description: '',
      children: [],
      usageCount: 0
    },
    decayModel: totem.decayModel || 'MEDIUM',
    usageCount: typeof totem.usageCount === 'number' ? totem.usageCount : 0,
    
    relationships: normalizeArray(totem.relationships, []),
    
    // Timestamps
    createdAt: normalizeTimestamp(totem.createdAt, now),
    updatedAt: normalizeTimestamp(totem.updatedAt, now),
    lastInteraction: normalizeTimestamp(totem.lastInteraction, now),
    
    // Legacy fields
    userId: normalizeString(totem.userId),
    userName: normalizeString(totem.userName),
    lastLike: normalizeTimestamp(totem.lastLike, 0),
  };
} 