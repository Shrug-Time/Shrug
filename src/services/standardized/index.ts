/**
 * Standardized Services
 * 
 * This module provides a consistent interface to all standardized data services.
 * These services ensure data conforms to the schema standards and abstracts
 * the database operations with proper error handling and validation.
 */

import { UserService } from '../userService';
import { PostService } from './PostService';
import { TotemService } from './TotemService';
import * as serviceHelpers from '@/utils/serviceHelpers';

// Re-export individual services
export { UserService, PostService, TotemService };

// Export service helper functions
export const {
  createTimestamp,
  handleServiceError,
  getUserProfile,
  getPost,
  getPaginatedPosts,
  getUserAnswers,
  getUserPosts
} = serviceHelpers;

// Default export for convenient importing
export default {
  user: UserService,
  post: PostService,
  totem: TotemService,
  
  // Helper functions
  helpers: serviceHelpers
};

/**
 * Fresh Start Approach Guide
 * 
 * In line with our implementation plan, we've taken a fresh start approach
 * with NO legacy field support. All legacy data has been dropped and we've
 * standardized on:
 * 
 * 1. Using 'firebaseUid' consistently for all user references
 * 2. Using numeric timestamps (milliseconds) for all date fields
 * 3. Applying strict validation for all data
 * 
 * Key changes in this implementation:
 * - All legacy fields have been REMOVED
 * - NO backward compatibility with old field names
 * - The database has been RESET to start fresh
 * - All services use the standardized fields only
 * 
 * When using these services:
 * - Always use 'firebaseUid' as the user identifier
 * - Use numeric timestamps in milliseconds format
 * - Follow the field naming conventions in the schema standards
 * 
 * This approach ensures:
 * - Cleaner codebase
 * - Better performance
 * - Easier maintenance
 * - No technical debt
 */ 