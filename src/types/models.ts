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
  createdAt?: number;
  updatedAt?: number;
  lastInteraction?: number;
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
  answerCount?: number;
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

// Custom Ad System Types (Simplified for $9.99 subscription promotion)
export type AdStatus = 'pending' | 'approved' | 'rejected';

export interface CommunityAd {
  id: string;
  submitterId: string; // Firebase UID of the submitter
  status: AdStatus;
  
  // Ad Content - Just the file
  pdfUrl: string; // URL to the uploaded PDF or PNG promoting $9.99 subscription
  
  // Simple Analytics
  impressions: number;
  clicks: number;
  
  // Timestamps
  submittedAt: number;
  approvedAt?: number;
  lastShown?: number; // For rotation tracking
}

export interface AdGuidelines {
  purpose: string;
  requirements: string[];
  technicalRequirements: {
    fileFormat: string;
    maxFileSize: string;
    recommendedSizes: string[];
  };
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

export interface ProfileSection {
  id: string;
  title: string;
  type: 'default' | 'custom';
  organizationMethod: 'chronological' | 'popularity' | 'series' | 'custom';
  contentIds: string[];
  position: number;
  isVisible: boolean;
  totemId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfileOrganization {
  userId: string;
  sections: ProfileSection[];
  layoutPreferences: {
    profileStyle: 'compact' | 'detailed';
    contentDisplay: 'cards' | 'list';
  };
} 