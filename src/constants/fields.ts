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
  // Standard fields
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
  
  // Legacy fields for backward compatibility
  LEGACY_USER_ID: 'userID',
  LEGACY_USER_ID_LOWERCASE: 'userId',
  LEGACY_USER_NAME: 'userName',
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
  LIKES: 'likes',
  
  // Answers
  ANSWERS: 'answers',
  ANSWER_COUNT: 'answerCount',
  ANSWER_USER_IDS: 'answerUserIds',
  ANSWER_FIREBASE_UIDS: 'answerFirebaseUids',
  ANSWER_USERNAMES: 'answerUsernames',
  
  // Legacy fields
  LEGACY_AUTHOR_ID: 'authorId',
  LEGACY_USER_ID: 'userId',
  LEGACY_USER_NAME: 'userName',
  LEGACY_USER_ID_UPPERCASE: 'userID',
  LEGACY_LAST_ENGAGEMENT: 'lastEngagement',
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
  
  // Legacy fields
  LEGACY_USER_ID: 'userId',
  LEGACY_USER_NAME: 'userName',
  LEGACY_USER_ID_UPPERCASE: 'userID',
} as const;

/**
 * Totem related field names
 */
export const TOTEM_FIELDS = {
  // Basic fields
  NAME: 'name',
  TOTEM_NAME: 'totemName',
  
  // Interaction metrics
  LIKES: 'likes',
  LIKED_BY: 'likedBy',
  LIKE_TIMES: 'likeTimes',
  LIKE_VALUES: 'likeValues',
  LAST_LIKE: 'lastLike',
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
  TOTEM_NAME: 'totemName',
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
  USER_ENDORSED: 'userEndorsed',
  AI_GENERATED: 'aiGenerated',
  APPLIED_BY: 'appliedBy',
  APPLIED_AT: 'appliedAt',
  ENDORSED_BY: 'endorsedBy',
  CONTESTED_BY: 'contestedBy',
} as const;

/**
 * Legacy field mapping for reference during standardization
 */
export const LEGACY_FIELD_MAPPING = {
  // User field mappings
  USER: {
    [USER_FIELDS.LEGACY_USER_ID]: USER_FIELDS.USERNAME,
    [USER_FIELDS.LEGACY_USER_ID_LOWERCASE]: USER_FIELDS.FIREBASE_UID,
    [USER_FIELDS.LEGACY_USER_NAME]: USER_FIELDS.NAME,
  },
  
  // Post field mappings
  POST: {
    [POST_FIELDS.LEGACY_USER_ID]: POST_FIELDS.FIREBASE_UID,
    [POST_FIELDS.LEGACY_USER_NAME]: POST_FIELDS.NAME,
    [POST_FIELDS.LEGACY_AUTHOR_ID]: POST_FIELDS.FIREBASE_UID,
  }
} as const; 