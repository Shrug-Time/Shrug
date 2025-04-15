export interface TotemLike {
  firebaseUid: string;
  originalTimestamp: number;
  lastUpdatedAt: number;
  isActive: boolean;
  value: number;
}

export interface Totem {
  name: string;
  crispness: number;
  likeHistory: TotemLike[];
  id?: string;
  description?: string;
  imageUrl?: string;
  category?: TotemCategory;
  decayModel?: DecayModel;
  usageCount?: number;
}

export interface Answer {
  id: string;
  text: string;
  totems: Totem[];
  firebaseUid: string;
  username: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
  lastInteraction?: number;
  isVerified?: boolean;
  isPremium?: boolean;
}

export interface Post {
  id: string;
  question: string;
  answers: Answer[];
  createdAt: number;
  updatedAt: number;
  lastInteraction?: number;
  firebaseUid?: string;
  username?: string;
  name?: string;
  categories?: string[];
  totemAssociations?: TotemAssociation[];
  score?: number;
  answerFirebaseUids?: string[];
  answerUsernames?: string[];
  answerUserIds?: string[];
}

export interface TotemSuggestion {
  totemName: string;
  confidence: number;
  reason: string;
  category: string;
}

export interface TotemAssociation {
  totemId: string;
  totemName: string;
  relevanceScore: number;
  firebaseUid: string;
  appliedAt: number;
  endorsedByFirebaseUids: string[];
  contestedByFirebaseUids: string[];
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

export type VerificationStatus = 'unverified' | 'email_verified' | 'verified';
export type MembershipTier = 'free' | 'premium' | 'admin';

export interface UserProfile {
  firebaseUid: string;
  username: string;
  name: string;
  email: string;
  bio: string;
  photoURL?: string;
  verificationStatus: VerificationStatus;
  membershipTier: MembershipTier;
  refreshesRemaining: number;
  refreshResetTime: number;
  following: string[];
  followers: string[];
  createdAt: number;
  updatedAt: number;
  lastInteraction: number;
  totems: {
    created: string[];
    frequently_used: string[];
    recent: string[];
  };
  expertise: string[];
} 