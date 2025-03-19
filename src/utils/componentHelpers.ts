/**
 * Component Helper Functions
 * 
 * Utility functions to help React components use standardized fields
 * while maintaining backward compatibility during the transition.
 */

import { USER_FIELDS, POST_FIELDS, TOTEM_FIELDS } from '@/constants/fields';
import { extractUserIdentifier } from './userIdHelpers';

/**
 * Gets a display name for a user from an object containing user fields
 * Tries standardized fields first, then falls back to legacy fields
 * 
 * @param obj Any object containing user name information
 * @returns A display name string, or 'Anonymous' if none is found
 */
export function getUserDisplayName(obj: any): string {
  if (!obj) return 'Anonymous';
  
  // Try standardized fields first
  if (obj[USER_FIELDS.NAME]) return obj[USER_FIELDS.NAME];
  
  // Then try legacy fields
  if (obj[USER_FIELDS.LEGACY_USER_NAME]) return obj[USER_FIELDS.LEGACY_USER_NAME];
  
  // If username is available, use that
  if (obj[USER_FIELDS.USERNAME]) return obj[USER_FIELDS.USERNAME];
  if (obj[USER_FIELDS.LEGACY_USER_ID]) return obj[USER_FIELDS.LEGACY_USER_ID];
  
  // Finally try direct property access for backward compatibility
  return obj.name || obj.userName || obj.username || obj.userID || 'Anonymous';
}

/**
 * Gets a Firebase UID from an object containing user fields
 * Tries standardized fields first, then falls back to legacy fields
 * 
 * @param obj Any object containing user ID information
 * @returns A Firebase UID string, or empty string if none is found
 */
export function getFirebaseUid(obj: any): string {
  if (!obj) return '';
  
  // Try standardized fields first
  if (obj[USER_FIELDS.FIREBASE_UID]) return obj[USER_FIELDS.FIREBASE_UID];
  
  // Then try legacy fields
  if (obj[USER_FIELDS.LEGACY_USER_ID_LOWERCASE]) return obj[USER_FIELDS.LEGACY_USER_ID_LOWERCASE];
  
  // Finally try direct property access for backward compatibility
  return obj.firebaseUid || obj.userId || '';
}

/**
 * Gets a username from an object containing user fields
 * Tries standardized fields first, then falls back to legacy fields
 * 
 * @param obj Any object containing username information
 * @returns A username string, or empty string if none is found
 */
export function getUsername(obj: any): string {
  if (!obj) return '';
  
  // Try standardized fields first
  if (obj[USER_FIELDS.USERNAME]) return obj[USER_FIELDS.USERNAME];
  
  // Then try legacy fields
  if (obj[USER_FIELDS.LEGACY_USER_ID]) return obj[USER_FIELDS.LEGACY_USER_ID];
  
  // Finally try direct property access for backward compatibility
  return obj.username || obj.userID || '';
}

/**
 * Gets a totem's like count, handling both standardized and legacy fields
 * 
 * @param totem Totem object
 * @returns Number of likes, or 0 if none is found
 */
export function getTotemLikes(totem: any): number {
  if (!totem) return 0;
  
  // Try standardized fields first
  if (totem[TOTEM_FIELDS.LIKES] !== undefined) return totem[TOTEM_FIELDS.LIKES];
  
  // Then try direct property access for backward compatibility
  return totem.likes || 0;
}

/**
 * Gets a totem's crispness score, handling both standardized and legacy fields
 * 
 * @param totem Totem object
 * @returns Crispness score (0-100), or 0 if none is found
 */
export function getTotemCrispness(totem: any): number {
  if (!totem) return 0;
  
  // Try standardized fields first
  if (totem[TOTEM_FIELDS.CRISPNESS] !== undefined) return totem[TOTEM_FIELDS.CRISPNESS];
  
  // Then try direct property access for backward compatibility
  return totem.crispness || 0;
}

/**
 * Checks if a user has liked a totem, handling both standardized and legacy fields
 * 
 * @param totem Totem object
 * @param userId User ID to check
 * @returns True if the user has liked the totem, false otherwise
 */
export function hasUserLikedTotem(totem: any, userId: string): boolean {
  if (!totem || !userId) return false;
  
  // Try standardized fields first
  const standardLikedBy = totem[TOTEM_FIELDS.LIKED_BY];
  if (standardLikedBy && Array.isArray(standardLikedBy)) {
    if (standardLikedBy.includes(userId)) return true;
  }
  
  // Then try direct property access for backward compatibility
  const legacyLikedBy = totem.likedBy;
  if (legacyLikedBy && Array.isArray(legacyLikedBy)) {
    if (legacyLikedBy.includes(userId)) return true;
  }
  
  return false;
} 