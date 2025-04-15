/**
 * Centralized field name constants for the application
 * Using these constants instead of string literals ensures consistency
 * and makes refactoring easier.
 */

/**
 * Common field names used across multiple entity types
 */
export const COMMON_FIELDS = {
  ID: 'id',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  LAST_INTERACTION: 'lastInteraction',
} as const;

/**
 * User related field names
 */
export const USER_FIELDS = {
  // Identity fields
  FIREBASE_UID: 'firebaseUid',
  USERNAME: 'username',
  NAME: 'name',
  EMAIL: 'email',
  BIO: 'bio',
  PHOTO_URL: 'photoURL',
  
  // Status fields
  VERIFICATION_STATUS: 'verificationStatus',
  MEMBERSHIP_TIER: 'membershipTier',
  REFRESHES_REMAINING: 'refreshesRemaining',
  REFRESH_RESET_TIME: 'refreshResetTime',
  
  // Social connections
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  
  // Totem relationships
  TOTEMS: 'totems',
  CREATED_TOTEMS: 'totems.created',
  FREQUENTLY_USED_TOTEMS: 'totems.frequently_used',
  RECENT_TOTEMS: 'totems.recent',
  
  // Expertise
  EXPERTISE: 'expertise',
} as const;

/**
 * Post related field names
 */
export const POST_FIELDS = {
  // Content fields
  QUESTION: 'question',
  CATEGORIES: 'categories',
  
  // User identification
  FIREBASE_UID: 'firebaseUid',
  USERNAME: 'username',
  NAME: 'name',
  
  // Totem associations
  TOTEM_ASSOCIATIONS: 'totemAssociations',
  TOTEMS: 'totems',
  
  // Engagement metrics
  SCORE: 'score',
  VIEWS: 'views',
  
  // Answers
  ANSWERS: 'answers',
  ANSWER_COUNT: 'answerCount',
  ANSWER_FIREBASE_UIDS: 'answerFirebaseUids',
  ANSWER_USERNAMES: 'answerUsernames',
  ANSWER_USER_IDS: 'answerUserIds',
} as const;

/**
 * Answer related field names
 */
export const ANSWER_FIELDS = {
  // Content fields
  ID: 'id',
  TEXT: 'text',
  
  // User identification
  FIREBASE_UID: 'firebaseUid',
  USERNAME: 'username',
  NAME: 'name',
  
  // Totems
  TOTEMS: 'totems',
  
  // Engagement
  LIKES: 'likes',
  
  // Status indicators
  IS_VERIFIED: 'isVerified',
  IS_PREMIUM: 'isPremium',
} as const;

/**
 * Totem related field names
 */
export const TOTEM_FIELDS = {
  // Basic fields
  ID: 'id',
  NAME: 'name',
  TOTEM_NAME: 'totemName',
  DESCRIPTION: 'description',
  IMAGE_URL: 'imageUrl',
  
  // Interaction metrics
  LIKE_HISTORY: 'likeHistory',
  FIREBASE_UID: 'firebaseUid',
  CRISPNESS: 'crispness',
  USAGE_COUNT: 'usageCount',
  
  // Categorization
  CATEGORY: 'category',
  DECAY_MODEL: 'decayModel',
  
  // Relationships
  RELATIONSHIPS: 'relationships',
} as const;

/**
 * Totem relationship related field names
 */
export const TOTEM_RELATIONSHIP_FIELDS = {
  TOTEM_ID: 'totemId',
  RELATIONSHIP_TYPE: 'relationshipType',
  STRENGTH: 'strength',
  SOURCES_COUNT: 'sourcesCount',
} as const;

/**
 * Totem association related field names
 */
export const TOTEM_ASSOCIATION_FIELDS = {
  TOTEM_ID: 'totemId',
  TOTEM_NAME: 'totemName',
  RELEVANCE_SCORE: 'relevanceScore',
  FIREBASE_UID: 'firebaseUid',
  APPLIED_AT: 'appliedAt',
  ENDORSED_BY_FIREBASE_UIDS: 'endorsedByFirebaseUids',
  CONTESTED_BY_FIREBASE_UIDS: 'contestedByFirebaseUids',
} as const;

/**
 * User totem interaction field names
 */
export const USER_TOTEM_INTERACTION_FIELDS = {
  FIREBASE_UID: 'firebaseUid',
  TOTEM_ID: 'totemId',
  INTERACTION_TYPE: 'interactionType',
  COUNT: 'count',
  FIRST_INTERACTION: 'firstInteraction',
  LAST_INTERACTION: 'lastInteraction',
  CONTEXT_COUNT: 'contextCount',
} as const; 