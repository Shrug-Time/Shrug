import { Timestamp } from 'firebase/firestore';

/**
 * Base interface for all entities that have timestamps
 */
export interface TimestampedEntity {
  createdAt: number;
  updatedAt: number;
  lastInteraction?: number;
}

/**
 * Represents a single like on a totem
 */
export interface TotemLike {
  /**
   * User ID who liked the totem
   */
  userId: string;
  
  /**
   * When the user first liked the totem (never changes)
   */
  originalTimestamp: number;
  
  /**
   * When the like status was last changed
   */
  lastUpdatedAt: number;
  
  /**
   * Whether the like is currently active
   */
  isActive: boolean;
  
  /**
   * Value of the like (typically 1)
   */
  value: number;
}

/**
 * Enhanced Totem interface with standardized timestamps and relationship structure
 */
export interface Totem extends TimestampedEntity {
  id: string;
  name: string;
  likes: number;
  likedBy: string[];
  likeTimes: number[]; // Changed from string[] to number[] for timestamp consistency
  likeValues: number[];
  lastLike?: number; // Changed from string to number for timestamp consistency
  crispness: number;
  category: TotemCategory;
  decayModel: DecayModel;
  usageCount: number;
  
  // Enhanced relationship structure
  relationships: TotemRelationship[];
  
  /**
   * Detailed like history
   */
  likeHistory?: TotemLike[];
}

/**
 * Defines the relationship between totems
 */
export interface TotemRelationship {
  totemId: string;
  relationshipType: 'related' | 'parent' | 'child' | 'similar' | 'opposite';
  strength: number; // 0-100 indicating relationship strength
  sourcesCount: number; // How many sources established this relationship
}

export type DecayModel = 'FAST' | 'MEDIUM' | 'NONE';

export interface TotemCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  children: string[];
  usageCount: number;
}

export interface TotemSuggestion {
  totemName: string;
  confidence: number;
  reason: string;
  category: string;
}

/**
 * User profile with standardized fields
 */
export interface UserProfile extends TimestampedEntity {
  // Core identity fields (standardized)
  firebaseUid: string;
  username: string;
  name: string;
  
  // Profile content
  email: string;
  bio?: string;
  photoURL?: string;
  
  // Status fields
  verificationStatus: 'unverified' | 'email_verified' | 'identity_verified';
  membershipTier: 'free' | 'basic' | 'premium';
  
  // Usage limits
  refreshesRemaining: number;
  refreshResetTime: string;
  
  // Social connections
  followers: string[];
  following: string[];
  
  // Totem relationships
  totems: {
    created: string[];
    frequently_used: string[];
    recent: string[];
  };
  
  // Expertise
  expertise: {
    category: string;
    level: number;
  }[];
  
  // Legacy fields for backward compatibility
  userID?: string;
  userId?: string;
  userName?: string;
}

/**
 * Enhanced user-totem interaction tracking
 */
export interface UserTotemInteraction {
  totemId: string;
  interactionType: 'created' | 'used' | 'viewed' | 'liked' | 'disliked';
  count: number;
  firstInteraction: number; // timestamp
  lastInteraction: number; // timestamp
  contextCount: Record<string, number>; // e.g., {"post": 5, "comment": 3}
}

/**
 * Answer with standardized fields
 */
export interface Answer extends TimestampedEntity {
  id: string; // Unique identifier for the answer
  text: string;
  
  // Standardized user fields
  firebaseUid: string;
  username: string;
  name: string;
  
  // Associated totems
  totems: Totem[];
  
  // Status indicators
  isVerified?: boolean;
  isPremium?: boolean;
  
  // Legacy fields for backward compatibility
  userId?: string;
  userName?: string;
}

/**
 * Post with standardized fields and enhanced totem connections
 */
export interface Post extends TimestampedEntity {
  id: string;
  question: string;
  
  // Standardized user fields
  firebaseUid: string;
  username: string;
  name: string;
  
  // Content categorization
  categories: string[];
  
  // Enhanced totem connection
  totemAssociations: TotemAssociation[];
  
  // Engagement metrics
  score?: number;
  
  // Answers
  answers: Answer[];
  answerFirebaseUids: string[];
  answerUsernames: string[];
  
  // Legacy fields for backward compatibility
  userId?: string;
  userName?: string;
  answerUserIds?: string[];
}

/**
 * Enhanced association between content and totems
 */
export interface TotemAssociation {
  totemId: string;
  relevanceScore: number; // 0-100
  appliedBy: string; // user ID who applied this totem
  appliedAt: number; // timestamp
  endorsedBy: string[]; // users who agree with this totem
  contestedBy: string[]; // users who disagree with this totem
} 