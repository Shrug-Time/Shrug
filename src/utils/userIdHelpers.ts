/**
 * Utility functions to help with user ID standardization
 */

import type { Post, Answer, UserProfile } from '@/types/models';

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