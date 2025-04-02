/**
 * User ID Helper Functions
 * 
 * This utility provides functions for standardizing user identifiers across the application.
 * It helps manage the transition from legacy field names to standardized field names.
 */

import { USER_FIELDS } from '@/constants/fields';
import type { Post, Answer, UserProfile } from '@/types/models';

/**
 * User identifier types used in the application
 */
export type UserIdentifierType = 'firebaseUid' | 'username' | 'legacy';

/**
 * Detects the type of user identifier provided
 * 
 * @param identifier The user identifier to check
 * @returns The type of identifier ('firebaseUid', 'username', or 'legacy')
 */
export function detectUserIdentifierType(identifier: string): UserIdentifierType {
  if (!identifier) {
    throw new Error('Invalid user identifier: empty value');
  }
  
  // Firebase UIDs are typically 28 characters
  // while usernames are typically shorter and alphanumeric
  if (identifier.length >= 20 && /^[A-Za-z0-9]{20,}$/.test(identifier)) {
    return 'firebaseUid';
  } else if (/^[a-z0-9_-]{3,15}$/.test(identifier)) {
    return 'username';
  } else {
    return 'legacy';
  }
}

/**
 * Standardizes a user identifier, ensuring it uses the correct field name
 * based on identifier type
 * 
 * @param identifier The user identifier value
 * @param field The desired output field
 * @returns An object with the correct field name and value
 */
export function standardizeUserIdentifier(
  identifier: string, 
  field: 'firebaseUid' | 'username' = 'firebaseUid'
): { field: string; value: string } {
  const type = detectUserIdentifierType(identifier);
  
  if (field === 'firebaseUid') {
    return {
      field: USER_FIELDS.FIREBASE_UID,
      value: identifier
    };
  } else {
    return {
      field: USER_FIELDS.USERNAME,
      value: identifier
    };
  }
}

/**
 * Creates a query constraint object for user identification in Firestore queries
 * This helps search across both new and legacy fields
 * 
 * @param identifier User identifier value
 * @returns Array of field/value pairs to use in queries
 */
export function createUserIdentifierQuery(identifier: string): Array<{ field: string; value: string; }> {
  const type = detectUserIdentifierType(identifier);
  
  if (type === 'firebaseUid') {
    return [
      // Main field
      { field: USER_FIELDS.FIREBASE_UID, value: identifier },
      // Legacy fields
      { field: USER_FIELDS.LEGACY_USER_ID_LOWERCASE, value: identifier }
    ];
  } else if (type === 'username') {
    return [
      // Main field
      { field: USER_FIELDS.USERNAME, value: identifier.toLowerCase() },
      // Legacy field
      { field: USER_FIELDS.LEGACY_USER_ID, value: identifier.toLowerCase() }
    ];
  } else {
    // For legacy or unknown types, try all user ID fields
    return [
      { field: USER_FIELDS.FIREBASE_UID, value: identifier },
      { field: USER_FIELDS.USERNAME, value: identifier.toLowerCase() },
      { field: USER_FIELDS.LEGACY_USER_ID, value: identifier.toLowerCase() },
      { field: USER_FIELDS.LEGACY_USER_ID_LOWERCASE, value: identifier }
    ];
  }
}

/**
 * Extracts a consistent identifier from a user profile
 * Helpful for ensuring consistent user identification throughout the app
 * 
 * @param user User profile (or partial user data)
 * @param type Type of identifier to extract
 * @returns The user identifier or null if not available
 */
export function extractUserIdentifier(
  user: Partial<UserProfile> | null, 
  type: UserIdentifierType = 'firebaseUid'
): string | null {
  if (!user) return null;
  
  if (type === 'firebaseUid') {
    return user.firebaseUid || user.userId || null;
  } else if (type === 'username') {
    return user.username || user.userID || null;
  } else {
    // Legacy - try to get any valid identifier
    return user.firebaseUid || user.userId || user.username || user.userID || null;
  }
}

/**
 * Helper function to extract all standard and legacy identifiers from a user profile
 * Useful for debugging or for comparison operations
 * 
 * @param user User profile
 * @returns Object containing all identifiers
 */
export function getAllUserIdentifiers(user: Partial<UserProfile> | null): Record<string, string | null> {
  if (!user) {
    return {
      firebaseUid: null,
      userId: null,
      username: null,
      userID: null,
    };
  }
  
  return {
    firebaseUid: user.firebaseUid || null,
    userId: user.userId || null,
    username: user.username || null,
    userID: user.userID || null,
  };
}

/**
 * Normalizes a post to ensure it has both old and new field names
 * This helps during the transition period
 */
export function normalizePostUserIds(post: any): Post {
  const normalizedPost = { ...post };
  
  // Handle creator fields
  if (normalizedPost.userId && !normalizedPost.firebaseUid) {
    normalizedPost.firebaseUid = normalizedPost.userId;
  } else if (normalizedPost.firebaseUid && !normalizedPost.userId) {
    normalizedPost.userId = normalizedPost.firebaseUid;
  }
  
  if (normalizedPost.userName && !normalizedPost.username) {
    normalizedPost.username = normalizedPost.userName;
    normalizedPost.name = normalizedPost.userName;
  } else if (normalizedPost.username && !normalizedPost.userName) {
    normalizedPost.userName = normalizedPost.username;
  }
  
  // Handle answer user IDs
  if (Array.isArray(normalizedPost.answerUserIds) && !normalizedPost.answerFirebaseUids) {
    normalizedPost.answerFirebaseUids = [...normalizedPost.answerUserIds];
  } else if (Array.isArray(normalizedPost.answerFirebaseUids) && !normalizedPost.answerUserIds) {
    normalizedPost.answerUserIds = [...normalizedPost.answerFirebaseUids];
  }
  
  // Normalize answers
  if (Array.isArray(normalizedPost.answers)) {
    normalizedPost.answers = normalizedPost.answers.map(normalizeAnswerUserIds);
  }
  
  return normalizedPost as Post;
}

/**
 * Normalizes an answer to ensure it has both old and new field names
 */
export function normalizeAnswerUserIds(answer: any): Answer {
  const normalizedAnswer = { ...answer };
  
  if (normalizedAnswer.userId && !normalizedAnswer.firebaseUid) {
    normalizedAnswer.firebaseUid = normalizedAnswer.userId;
  } else if (normalizedAnswer.firebaseUid && !normalizedAnswer.userId) {
    normalizedAnswer.userId = normalizedAnswer.firebaseUid;
  }
  
  if (normalizedAnswer.userName && !normalizedAnswer.username) {
    normalizedAnswer.username = normalizedAnswer.userName;
    normalizedAnswer.name = normalizedAnswer.userName;
  } else if (normalizedAnswer.username && !normalizedAnswer.userName) {
    normalizedAnswer.userName = normalizedAnswer.username;
  }
  
  return normalizedAnswer as Answer;
}

/**
 * Normalizes a user profile to ensure it has both old and new field names
 */
export function normalizeUserProfileIds(profile: any): UserProfile {
  const normalizedProfile = { ...profile };
  
  if (normalizedProfile.userID && !normalizedProfile.username) {
    normalizedProfile.username = normalizedProfile.userID;
  } else if (normalizedProfile.username && !normalizedProfile.userID) {
    normalizedProfile.userID = normalizedProfile.username;
  }
  
  return normalizedProfile as UserProfile;
}

/**
 * Checks if a string is likely a Firebase UID
 */
export function isFirebaseUid(id: string): boolean {
  // Firebase UIDs are typically 28 characters long and contain letters and numbers
  return /^[A-Za-z0-9]{20,28}$/.test(id);
}

/**
 * Checks if a string is likely a username
 */
export function isUsername(id: string): boolean {
  // Usernames are typically shorter and may contain underscores and hyphens
  return /^[a-z0-9_-]{3,15}$/i.test(id);
} 