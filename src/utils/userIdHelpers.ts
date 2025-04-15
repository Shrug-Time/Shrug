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
export type UserIdentifierType = 'firebaseUid' | 'username';

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
  
  // Firebase UIDs are typically 28 characters
  // while usernames are typically shorter and alphanumeric
  if (identifier.length >= 20 && /^[A-Za-z0-9]{20,}$/.test(identifier)) {
    return 'firebaseUid';
  } else {
    return 'username';
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