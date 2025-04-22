# Service Layer Architecture

This document explains the Service Layer Architecture implemented for the Shrug MVP. The service layer provides a clean separation between UI components and data access logic.

## Overview

The Service Layer Architecture includes:

1. **Service Modules**: Logical groupings of related functionality
2. **Error Handling**: Consistent error management across services
3. **Caching**: Performance optimization for frequently accessed data
4. **Transaction Safety**: Data consistency for multi-step operations

## Service Organization

Services are organized by domain:

```
src/
  services/
    TransactionService.ts        # Transaction handling utilities
    ErrorHandlingService.ts      # Error handling utilities
    CacheService.ts              # Caching utilities
    standardized/                # Standardized service implementations
      PostService.ts             # Post-related operations
      UserService.ts             # User profile operations
      TotemService.ts            # Totem-related operations
      SubscriptionService.ts     # Subscription management
      ContentGatingService.ts    # Content access control
```

## Key Benefits

- **Separation of Concerns**: UI components don't need to know about database implementation
- **Code Reusability**: Services can be used by multiple components
- **Maintainability**: Easier to update data access logic in one place
- **Testability**: Services can be unit tested independently
- **Consistency**: Standard patterns for error handling and transactions

## Using Services in Components

### Before (Direct Firebase Usage)

```typescript
// Component with direct Firebase access
const MyComponent = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        // Direct Firebase access in component
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  // Rest of component...
}
```

### After (Using Service Layer)

```typescript
import { PostService } from '@/services/standardized/PostService';
import { ErrorHandlingService } from '@/services/ErrorHandlingService';

// Component using service layer
const MyComponent = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        // Use service instead of direct Firebase access
        const result = await PostService.getPaginatedPosts();
        setPosts(result.posts);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(ErrorHandlingService.getUserFriendlyMessage(err));
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  // Rest of component...
}
```

## Service Layer Best Practices

### 1. Always Use Services for Data Access

Never access Firebase directly from components. Instead, use the appropriate service.

### 2. Consistent Method Signatures

Follow these patterns for service methods:

- Use static methods with clear, descriptive names
- Return Promises that resolve to typed data structures
- Handle errors within the service when appropriate
- Document parameters and return types

### 3. Error Handling

Use the ErrorHandlingService for consistent error handling:

```typescript
try {
  // Service operation
} catch (error) {
  return ErrorHandlingService.handleServiceError('operation name', error, defaultValue);
}
```

### 4. Transaction Safety

Use TransactionService for operations that modify related data:

```typescript
return await TransactionService.executeTransaction(
  'operation name',
  async (transaction) => {
    // Transaction operations
  }
);
```

### 5. Caching

Use CacheService for frequently accessed data:

```typescript
return await CacheService.getOrSet(
  cacheKey,
  async () => {
    // Data fetching logic
  },
  cacheTtl
);
```

### 6. Clear Documentation

Document service methods with JSDoc comments:

```typescript
/**
 * Gets user profile data
 * 
 * @param userId User's Firebase UID
 * @returns User profile or null if not found
 */
static async getUserProfile(userId: string): Promise<UserProfile | null> {
  // Implementation
}
```

## Implementation Status

The Service Layer Architecture implementation is complete, providing:

- Standardized service interfaces for all data operations
- Consistent error handling and reporting
- Memory caching for performance optimization
- Transaction safety for data consistency
- Clear separation between UI and data access logic

These improvements significantly enhance code quality, maintainability, and performance of the Shrug platform. 