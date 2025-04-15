/**
 * Component Helper Functions
 * 
 * Utility functions to help React components use standardized fields
 * while maintaining backward compatibility during the transition.
 */

import { USER_FIELDS, POST_FIELDS, TOTEM_FIELDS } from '@/constants/fields';

/**
 * Gets a display name for a user from an object containing user fields
 * 
 * @param obj Any object containing user name information
 * @returns A display name string, or 'Anonymous' if none is found
 */
export function getUserDisplayName(obj: any): string {
  if (!obj) return 'Anonymous';
  
  // Try standardized fields
  if (obj[USER_FIELDS.NAME]) return obj[USER_FIELDS.NAME];
  
  // If username is available, use that
  if (obj[USER_FIELDS.USERNAME]) return obj[USER_FIELDS.USERNAME];
  
  // Direct property access
  return obj.name || obj.username || 'Anonymous';
}

/**
 * Gets a Firebase UID from an object containing user fields
 * 
 * @param obj Any object containing user ID information
 * @returns A Firebase UID string, or empty string if none is found
 */
export function getFirebaseUid(obj: any): string {
  if (!obj) return '';
  
  // Try standardized fields
  if (obj[USER_FIELDS.FIREBASE_UID]) return obj[USER_FIELDS.FIREBASE_UID];
  
  // Direct property access
  return obj.firebaseUid || '';
}

/**
 * Gets a username from an object containing user fields
 * 
 * @param obj Any object containing username information
 * @returns A username string, or empty string if none is found
 */
export function getUsername(obj: any): string {
  if (!obj) return '';
  
  // Try standardized fields
  if (obj[USER_FIELDS.USERNAME]) return obj[USER_FIELDS.USERNAME];
  
  // Direct property access
  return obj.username || '';
}

/**
 * Gets a totem's like count from likeHistory
 * 
 * @param totem Totem object
 * @returns Number of active likes
 */
export function getTotemLikes(totem: any): number {
  if (!totem?.likeHistory) return 0;
  return totem.likeHistory.filter((like: { isActive: boolean }) => like.isActive).length;
}

/**
 * Gets a totem's crispness score
 * 
 * @param totem Totem object
 * @returns Crispness score (0-100), or 0 if none is found
 */
export function getTotemCrispness(totem: any): number {
  if (!totem?.crispness) return 0;
  return totem.crispness;
}

/**
 * Checks if a user has liked a totem
 * 
 * @param totem Totem object
 * @param firebaseUid User ID to check
 * @returns True if the user has liked the totem, false otherwise
 */
export function hasUserLikedTotem(totem: any, firebaseUid: string): boolean {
  if (!totem || !firebaseUid) {
    return false;
  }
  
  // Use likeHistory for checking likes
  if (totem.likeHistory && Array.isArray(totem.likeHistory)) {
    const existingLike = totem.likeHistory.find((like: { firebaseUid: string; isActive: boolean }) => 
      like.firebaseUid === firebaseUid
    );
    
    // If there's no like history entry, the user hasn't liked the totem
    if (!existingLike) {
      return false;
    }
    
    // If there is a like history entry, return its active state
    return existingLike.isActive;
  }
  
  return false;
} 