import { Timestamp } from 'firebase/firestore';

export interface Totem {
  name: string;
  likes: number;
  lastLike: string | null;
  likedBy: string[];
  crispness?: number;
  likeTimes: string[];
  likeValues: number[];
}

export interface Answer {
  text: string;
  userId: string;
  userName: string;
  userID: string;
  createdAt: any;
  totems: Totem[];
}

export interface Post {
  id: string;
  question: string;
  answers: Answer[];
}

export interface UserProfile {
  /** User's full name */
  name: string;
  /** Unique user identifier, must be less than 15 characters */
  userID: string;
  bio: string;
  verificationStatus: 'unverified' | 'email_verified' | 'identity_verified';
  membershipTier: 'free' | 'basic' | 'premium';
  refreshCount: number;
  /** Array of userIDs that this user follows */
  following: string[];
  /** Array of userIDs that follow this user */
  followers: string[];
  notificationPreferences: {
    email: boolean;
    push: boolean;
    contentUpdates: boolean;
  };
  monetizationSettings: {
    premiumContentEnabled: boolean;
    pricePerAnswer: number;
  };
} 