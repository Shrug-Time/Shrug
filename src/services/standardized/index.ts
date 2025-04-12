/**
 * Standardized Services Index
 * 
 * This file exports all standardized services that follow schema standards.
 * Use these services for all database operations to ensure data consistency.
 */

export { UserService } from './UserService';
export { PostService } from './PostService';
export { TotemService } from './TotemService';

/**
 * Migration Guide
 * 
 * To migrate from legacy services to standardized services:
 * 
 * 1. Import from standardized services:
 *    - Old: import { PostService } from '@/services/firebase';
 *    - New: import { PostService } from '@/services/standardized';
 * 
 * 2. Update function calls if needed:
 *    - Methods are similar but may have slightly different parameter names
 *    - All methods now use firebaseUid consistently instead of userId
 *    - All methods handle timestamp conversion and validation automatically
 * 
 * 3. Ensure your code uses the standardized field names:
 *    - Use 'firebaseUid' instead of 'userId'
 *    - Timestamps are consistently in milliseconds since epoch
 * 
 * Benefits of using standardized services:
 * - Consistent data formats
 * - Automatic validation
 * - Proper error handling
 * - Optimized for performance
 */ 