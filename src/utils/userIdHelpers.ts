/**
 * User ID Helper Functions
 * 
 * This utility provides functions for standardizing user identifiers across the application.
 */

import { USER_FIELDS } from '@/constants/fields';
import type { Post, Answer } from '@/types/models';

/**
 * User identifier types used in the application
 */
export type UserIdentifierType = 'firebaseUid' | 'username' | 'legacy';

/**
 * Detects the type of user identifier provided
 * 
 * @param identifier The user identifier to check
 * @returns The type of identifier ('firebaseUid' or 'username')
 */
export function detectUserIdentifierType(identifier: string): UserIdentifierType {
  if (!identifier) {
    throw new Error('Invalid user identifier: empty value');
  }
  
  // Firebase UIDs are typically 28 characters long and alphanumeric
  if (identifier.length >= 20 && /^[A-Za-z0-9]{20,}$/.test(identifier)) {
    return 'firebaseUid';
  }
  
  // Usernames are typically 3-15 characters, alphanumeric with underscores/hyphens
  if (/^[a-zA-Z0-9_-]{3,15}$/.test(identifier)) {
    return 'username';
  }
  
  // Everything else is legacy (contains special chars, wrong length, etc)
  return 'legacy';
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
 * 
 * @param identifier User identifier value
 * @returns Array of field/value pairs to use in queries
 */
export function createUserIdentifierQuery(identifier: string): Array<{ field: string; value: string; }> {
  const type = detectUserIdentifierType(identifier);
  
  if (type === 'firebaseUid') {
    return [
      { field: USER_FIELDS.FIREBASE_UID, value: identifier }
    ];
  } else {
    return [
      { field: USER_FIELDS.USERNAME, value: identifier.toLowerCase() }
    ];
  }
}

/**
 * Pass-through function for backward compatibility with existing code
 */
export function normalizePostUserIds(post: Post): Post {
  return post;
}

/**
 * Pass-through function for backward compatibility with existing code
 */
export function normalizeAnswerUserIds(answer: Answer): Answer {
  return answer;
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

/**
 * Extracts a specific identifier from a user object (handles both legacy and standard formats)
 */
export function extractUserIdentifier(user: any, field: 'firebaseUid' | 'username'): string | null {
  if (!user) return null;
  
  if (field === 'firebaseUid') {
    return user.firebaseUid || user.uid || user.id || user.userId || null;
  } else {
    return user.username || user.userID || user.name || null;
  }
}

/**
 * Normalizes user profile IDs for consistency
 */
export function normalizeUserProfileIds(profile: any): any {
  return profile;
} 