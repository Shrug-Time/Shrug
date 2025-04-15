/**
 * Validation Schemas
 * 
 * This module defines Zod validation schemas for all data models in the application.
 * These schemas are used to validate data at runtime and provide type safety.
 */

import { z } from 'zod';

/**
 * Basic timestamp entity schema used for common fields
 */
export const timestampedEntitySchema = z.object({
  createdAt: z.number().positive(),
  updatedAt: z.number().positive(),
  lastInteraction: z.number().positive().optional(),
});

/**
 * Schema for validating totem likes
 */
export const totemLikeSchema = z.object({
  firebaseUid: z.string().min(1),
  originalTimestamp: z.number().positive(),
  lastUpdatedAt: z.number().positive(),
  isActive: z.boolean(),
  value: z.number().default(1),
});

/**
 * Schema for totem relationships
 */
export const totemRelationshipSchema = z.object({
  totemId: z.string().min(1),
  relationshipType: z.enum(['related', 'parent', 'child', 'similar', 'opposite']),
  strength: z.number().min(0).max(100),
  sourcesCount: z.number().nonnegative(),
});

/**
 * Schema for totem categories
 */
export const totemCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  parentId: z.string().optional(),
  children: z.array(z.string()),
  usageCount: z.number().nonnegative(),
});

/**
 * Schema for decay model enum
 */
export const decayModelSchema = z.enum(['FAST', 'MEDIUM', 'NONE']);

/**
 * Complete Totem schema
 */
export const totemSchema = timestampedEntitySchema.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  likeHistory: z.array(totemLikeSchema),
  crispness: z.number().min(0).max(100),
  category: totemCategorySchema,
  decayModel: decayModelSchema,
  usageCount: z.number().nonnegative(),
  
  // Optional relationships
  relationships: z.array(totemRelationshipSchema).optional(),
});

/**
 * Schema for user expertise
 */
export const expertiseSchema = z.object({
  category: z.string().min(1),
  level: z.number().min(0).max(10),
});

/**
 * User profile totem relationships schema
 */
export const userTotemsSchema = z.object({
  created: z.array(z.string()),
  frequently_used: z.array(z.string()),
  recent: z.array(z.string()),
});

/**
 * Complete User Profile schema
 */
export const userProfileSchema = timestampedEntitySchema.extend({
  // Core identity fields
  firebaseUid: z.string().min(1),
  username: z.string().min(3).max(15),
  name: z.string().min(1),
  
  // Profile content
  email: z.string().email(),
  bio: z.string().optional(),
  photoURL: z.string().url().optional(),
  
  // Status fields
  verificationStatus: z.enum(['unverified', 'email_verified', 'identity_verified']),
  membershipTier: z.enum(['free', 'basic', 'premium']),
  
  // Usage limits
  refreshesRemaining: z.number().nonnegative(),
  refreshResetTime: z.number().positive(),
  
  // Social connections
  followers: z.array(z.string()),
  following: z.array(z.string()),
  
  // Totem relationships
  totems: userTotemsSchema,
  
  // Expertise
  expertise: z.array(expertiseSchema),
});

/**
 * Schema for totem associations
 */
export const totemAssociationSchema = z.object({
  totemId: z.string().min(1),
  totemName: z.string().min(1),
  relevanceScore: z.number().min(0).max(100),
  firebaseUid: z.string().min(1),
  appliedAt: z.number().positive(),
  endorsedByFirebaseUids: z.array(z.string()),
  contestedByFirebaseUids: z.array(z.string()),
});

/**
 * Schema for user totem interaction
 */
export const userTotemInteractionSchema = z.object({
  firebaseUid: z.string().min(1),
  totemId: z.string().min(1),
  interactionType: z.enum(['created', 'used', 'viewed', 'liked', 'disliked']),
  count: z.number().nonnegative(),
  firstInteraction: z.number().positive(),
  lastInteraction: z.number().positive(),
  contextCount: z.record(z.string(), z.number()),
});

/**
 * Answer schema
 */
export const answerSchema = timestampedEntitySchema.extend({
  id: z.string().min(1),
  text: z.string().min(1),
  
  // User fields
  firebaseUid: z.string().min(1),
  username: z.string().min(1),
  name: z.string().min(1),
  
  // Associated totems
  totems: z.array(totemSchema),
  
  // Status indicators
  isVerified: z.boolean().optional(),
  isPremium: z.boolean().optional(),
});

/**
 * Post schema
 */
export const postSchema = timestampedEntitySchema.extend({
  id: z.string().min(1),
  question: z.string().min(1),
  
  // User fields
  firebaseUid: z.string().min(1),
  username: z.string().min(1),
  name: z.string().min(1),
  
  // Content categorization
  categories: z.array(z.string()),
  
  // Totem connections
  totemAssociations: z.array(totemAssociationSchema),
  
  // Engagement metrics
  score: z.number().optional(),
  
  // Answers
  answers: z.array(answerSchema),
  answerFirebaseUids: z.array(z.string()),
  answerUsernames: z.array(z.string()),
}); 