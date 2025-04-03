import { Timestamp } from 'firebase/firestore';
import type { Post, Answer, Totem } from '@/types/models';
import { getTotemLikes } from '@/utils/componentHelpers';

/**
 * Safely converts a Firestore Timestamp to milliseconds
 */
export function timestampToMillis(timestamp: Timestamp | Date | number | undefined | null): number {
  if (!timestamp) return Date.now();
  
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  return Date.now();
}

/**
 * Normalizes a Totem object to ensure all properties exist
 */
export function normalizeTotem(totem: Partial<Totem>): Totem {
  const now = Date.now();
  return {
    id: totem.id || '',
    name: totem.name || '',
    description: totem.description,
    imageUrl: totem.imageUrl,
    likeHistory: totem.likeHistory || [],
    crispness: totem.crispness || 0,
    category: totem.category || {
      id: 'general',
      name: 'General',
      description: 'General category',
      children: [],
      usageCount: 0
    },
    decayModel: totem.decayModel || 'MEDIUM',
    usageCount: totem.usageCount || 0,
    relationships: totem.relationships || [],
    userId: totem.userId,
    userName: totem.userName,
    lastLike: totem.lastLike,
    createdAt: totem.createdAt || now,
    updatedAt: totem.updatedAt || now,
    lastInteraction: totem.lastInteraction || now
  };
}

/**
 * Normalizes an Answer object to ensure all properties exist
 */
export function normalizeAnswer(answer: Record<string, any>): Answer {
  const now = Date.now();
  return {
    id: answer.id || `${answer.firebaseUid || answer.userId}_${now}`,
    text: answer.text || '',
    firebaseUid: answer.firebaseUid || answer.userId || '',
    username: answer.username || answer.userName || '',
    name: answer.name || answer.userName || '',
    totems: Array.isArray(answer.totems)
      ? answer.totems.map(normalizeTotem)
      : [],
    createdAt: typeof answer.createdAt === 'number' ? answer.createdAt : now,
    updatedAt: typeof answer.updatedAt === 'number' ? answer.updatedAt : now,
    lastInteraction: typeof answer.lastInteraction === 'number' ? answer.lastInteraction : now,
    isVerified: answer.isVerified || false,
    isPremium: answer.isPremium || false,
    userId: answer.userId || answer.firebaseUid || '',
    userName: answer.userName || answer.name || ''
  };
}

/**
 * Normalizes a Post object from Firestore
 */
export function normalizePost(id: string, data: Record<string, any>): Post {
  const now = Date.now();
  
  // Normalize answers array
  const answers = Array.isArray(data.answers)
    ? data.answers.map(normalizeAnswer)
    : [];
  
  // Extract user IDs from answers for easier querying
  const answerFirebaseUids = [...new Set(
    answers.map(answer => answer.firebaseUid).filter(Boolean)
  )];
  
  const answerUsernames = [...new Set(
    answers.map(answer => answer.username).filter(Boolean)
  )];
  
  return {
    id,
    question: data.question || '',
    firebaseUid: data.firebaseUid || data.userId || '',
    username: data.username || data.userName || '',
    name: data.name || data.userName || '',
    categories: Array.isArray(data.categories) ? data.categories : [],
    totemAssociations: Array.isArray(data.totemAssociations) ? data.totemAssociations : [],
    score: data.score,
    answers,
    answerFirebaseUids,
    answerUsernames,
    userId: data.userId || data.firebaseUid || '',
    userName: data.userName || data.name || '',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : now,
    lastInteraction: typeof data.lastInteraction === 'number' ? data.lastInteraction : now
  };
} 