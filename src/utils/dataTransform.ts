import { Timestamp } from 'firebase/firestore';
import type { Post, Answer, Totem } from '@/types/models';

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
  return {
    name: totem.name || '',
    likes: totem.likes || 0,
    likedBy: totem.likedBy || [],
    likeTimes: totem.likeTimes || [],
    likeValues: totem.likeValues || [],
    lastLike: totem.lastLike || undefined,
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
    relatedTotems: totem.relatedTotems || []
  };
}

/**
 * Normalizes an Answer object to ensure all properties exist
 */
export function normalizeAnswer(answer: Record<string, any>): Answer {
  return {
    text: answer.text || '',
    userId: answer.userId || '',
    userName: answer.userName || 'Anonymous',
    createdAt: typeof answer.createdAt === 'number' ? answer.createdAt : Date.now(),
    totems: Array.isArray(answer.totems) 
      ? answer.totems.map(normalizeTotem)
      : [],
    isVerified: answer.isVerified || false,
    isPremium: answer.isPremium || false
  };
}

/**
 * Normalizes a Post object from Firestore
 */
export function normalizePost(id: string, data: Record<string, any>): Post {
  // Ensure createdAt and lastEngagement are numbers
  const createdAt = timestampToMillis(data.createdAt);
  const lastEngagement = timestampToMillis(data.lastEngagement) || createdAt;
  
  // Normalize answers array
  const answers = Array.isArray(data.answers)
    ? data.answers.map(normalizeAnswer)
    : [];
  
  // Extract user IDs from answers for easier querying
  const answerUserIds = answers
    .map(answer => answer.userId)
    .filter(Boolean) as string[];
  
  return {
    id,
    question: data.question || '',
    userId: data.userId || '',
    userName: data.userName || 'Anonymous',
    createdAt,
    lastEngagement,
    categories: Array.isArray(data.categories) ? data.categories : [],
    answers,
    score: data.score || 0,
    // Add this field for easier querying
    answerUserIds: [...new Set(answerUserIds)]
  };
} 