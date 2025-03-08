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
  createdAt: any;
  totems: Totem[];
}

export interface Post {
  id: string;
  question: string;
  answers: Answer[];
}

export interface UserProfile {
  displayName: string;
  bio: string;
  verificationStatus: 'unverified' | 'email_verified' | 'identity_verified';
  membershipTier: 'free' | 'basic' | 'premium';
  refreshCount: number;
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