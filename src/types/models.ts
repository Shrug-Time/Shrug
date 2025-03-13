import { Timestamp } from 'firebase/firestore';

export interface Totem {
  name: string;
  likes: number;
  likedBy: string[];
  likeTimes: string[];
  likeValues: number[];
  lastLike?: string;
  crispness: number;
  category: TotemCategory;
  decayModel: DecayModel;
  usageCount: number;
  relatedTotems: string[];
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

export interface UserProfile {
  userID: string;
  name: string;
  email: string;
  bio?: string;
  photoURL?: string;
  verificationStatus: 'unverified' | 'email_verified' | 'identity_verified';
  membershipTier: 'free' | 'basic' | 'premium';
  refreshesRemaining: number;
  refreshResetTime: string;
  followers: string[];
  following: string[];
  createdAt: string;
  totems: {
    created: string[];
    frequently_used: string[];
    recent: string[];
  };
  expertise: {
    category: string;
    level: number;
  }[];
}

export interface Answer {
  text: string;
  userId: string;
  userName: string;
  createdAt: number;
  totems: Totem[];
  isVerified?: boolean;
  isPremium?: boolean;
}

export interface Post {
  id: string;
  question: string;
  userId: string;
  userName: string;
  createdAt: number;
  lastEngagement: number;
  categories: string[];
  answers: Answer[];
  score?: number;
} 