# Shrug - A Social Platform for Questions and Answers

## Overview
Shrug is a social platform where users can ask questions and receive answers using a unique "totem" system. Users can like and interact with totems, creating a dynamic community of shared knowledge and perspectives.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Key Features](#key-features)
5. [Documentation](#documentation)
6. [Current Progress](#current-progress)
7. [Data Fetching Strategy](#data-fetching-strategy)
   - [Current Implementation](#current-implementation)
   - [Future Optimization Plans](#future-optimization-plans)
   - [Technical Considerations](#technical-considerations)
8. [Like Button Fix Plan](#like-button-fix-plan)
9. [Debugging Guide](#debugging-guide-for-likeunlike-issues)
10. [Performance Considerations](#performance-considerations)
11. [User Identification](#user-identification)
12. [Scalability Improvement Plan](#scalability-improvement-plan)
13. [Standardization Plan](#shrug-version-16)
14. [Decision Log](#decision-log)
15. [Issue Tracker](#issue-tracker)
16. [TotemButton Implementation Plan](#totembutton-implementation-plan)
17. [Like/Unlike Fix Plan](#likeunlike-fix-plan)

## Data Fetching Strategy

### Current Implementation
The application currently uses a client-side data fetching strategy for Firebase operations. This decision was made to:
1. Quickly resolve Firebase initialization issues in server components
2. Maintain compatibility with the existing Firebase setup
3. Provide a simple, working solution that can be optimized later

#### Key Components
- Server components handle layout and static content
- Client components handle data fetching and real-time updates
- Firebase operations are performed exclusively in client components

### Future Optimization Plans

#### Phase 1: Server-Side Firebase Integration
- Implement proper Firebase initialization for server components
- Add server-side rendering for initial page loads
- Maintain real-time updates through client components
- Expected timeline: 1-2 weeks

#### Phase 2: Performance Optimization
- Implement caching strategies
- Add data prefetching for common user flows
- Optimize bundle size and loading performance
- Expected timeline: 2-3 weeks

#### Phase 3: Advanced Features
- Add offline support
- Implement optimistic updates
- Add data persistence strategies
- Expected timeline: 1-2 months

### Technical Considerations
1. **Current Limitations**
   - No server-side rendering for dynamic content
   - Slightly slower initial page loads
   - Higher client-side JavaScript bundle size

2. **Benefits**
   - Simple, working implementation
   - Easy to maintain and debug
   - Clear separation of concerns

3. **Migration Path**
   - Can gradually move to server-side rendering
   - No need for immediate refactoring
   - Flexible for future architectural changes

## Quick Start
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run the development server: `npm run dev`

## Tech Stack
- Next.js 14
- TypeScript
- Firebase (Authentication & Firestore)
- Tailwind CSS
- React Query

## Project Structure
```
src/
├── app/                 # Next.js app router pages
├── components/         # React components
│   ├── common/        # Shared components
│   ├── questions/     # Question-related components
│   └── totem/         # Totem-related components
├── lib/               # Utility functions and configurations
├── services/          # Business logic and API calls
└── types/            # TypeScript type definitions
```

## Key Features
- User authentication
- Question creation and management
- Totem-based answer system
- Like/unlike functionality
- Real-time updates
- Responsive design

## Documentation
- [Architecture](docs/ARCHITECTURE.md) - System design and data models
- [Development](docs/DEVELOPMENT.md) - Development guidelines and patterns
- [Changelog](docs/CHANGELOG.md) - Version history and future plans
- [Plans](docs/PLANS.md) - Detailed project plans and progress

## Current Progress
- ✅ Core functionality implemented
- ✅ Like system fixed and optimized
- ✅ Component structure standardized
- 🔄 Performance optimizations in progress
- 📝 Testing implementation planned

## Like Button Fix Plan

### Phase 1: Immediate Fix (1-2 days) ✅
- ✅ Create centralized auth context for consistent auth state
- ✅ Create centralized like state context for consistent like state
- ✅ Update TotemButton to use new contexts
- ✅ Add proper error handling and user feedback

### Phase 2: Short-term Fix (1 week) ✅
- ✅ Remove local caching from PostTotemClient
- ✅ Standardize error handling across components
- ✅ Add proper loading states
- ✅ Implement proper rollback mechanisms

### Phase 3: Medium-term Fix (2-3 weeks) 🔄
- ✅ Complete transition to likeHistory structure
- 🔄 Remove legacy likedBy array usage (in progress)
- ✅ Update all components to use new data structure
- ✅ Add data migration tools

### Phase 4: Long-term Fix (1-2 months) 📝
- 📝 Implement denormalized data structure
- 📝 Add proper monitoring and error tracking
- 📝 Implement proper caching with new architecture
- 📝 Improve performance and scalability

## Current Status
The like/unlike functionality is now working correctly with the following improvements:
- ✅ Proper error handling and user feedback
- ✅ Consistent auth state management
- ✅ Server-side state management (removed optimistic updates)
- ✅ Real-time updates
- ✅ Proper data structure using likeHistory
- ✅ Transaction-based like/unlike operations
- ✅ Proper error handling and rollback
- 🔄 Legacy likedBy array removal in progress (maintained for backward compatibility)

## Debugging Guide for Like/Unlike Issues

### What We've Tried (And Why It Didn't Work)
1. **Adding Extensive Logging**
   - Added transaction logs, real-time update logs, and state change logs
   - Helped diagnose the flow but didn't fix the core issue
   - Lesson: Logging is helpful but can't fix architectural issues

2. **Modifying Transaction Logic**
   - Updated transaction to handle both like and unlike cases
   - Transaction works correctly but UI doesn't update
   - Lesson: The issue isn't with the database operations

3. **Adding React Query Cache Invalidation**
   - Implemented cache invalidation for optimistic updates
   - Made the system more complex and introduced race conditions
   - Lesson: Don't mix different state management approaches

4. **Implementing Optimistic Updates**
   - Added client-side state updates before server confirmation
   - Created state synchronization issues
   - Lesson: Keep state management simple and consistent

### What We Should Check Next Time
1. **Parent Component Update Flow**
   - How are real-time updates being handled in parent components?
   - Are updates being properly propagated to child components?
   - Are the data structures consistent between parent and child?

2. **Data Structure Verification**
   - Does the real-time update data structure match what components expect?
   - Are we properly processing the likeHistory array?
   - Is there a mismatch between server and client data structures?

3. **Component Update Triggers**
   - What exactly triggers a re-render in the parent components?
   - Are we using the correct React patterns for state updates?
   - Is there unnecessary re-rendering happening?

### Questions to Ask When Debugging Like Issues
1. "Can you show me the logs from when you click the like button?"
2. "Which component is rendering the TotemButton?"
3. "Are you seeing any console errors?"
4. "Is the real-time listener being triggered?"
5. "What's the current state of the likeHistory array?"

### Recommendations for Future Fixes
1. **Start with Component Hierarchy**
   - Map out the component tree
   - Identify where state updates should trigger
   - Verify data flow between components

2. **Verify Data Structures**
   - Check server-side data structure
   - Verify client-side expectations
   - Ensure consistency in data transformation

3. **Test Real-time Updates**
   - Verify listener setup
   - Check update propagation
   - Confirm state updates trigger re-renders

4. **Keep It Simple**
   - Avoid mixing state management approaches
   - Maintain single source of truth
   - Use React's built-in state management when possible

## Performance Considerations

### Current Issues
1. **Firebase Initialization**
   - Multiple "Initializing Firebase app for the first time" messages in development
   - Not affecting production but should be optimized
   - Solution: Implement proper singleton pattern for Firebase initialization

2. **Tailwind Configuration**
   - Warning about content pattern matching node_modules
   - Pattern: `./src/**/*.ts`
   - Solution: Update content configuration to be more specific

3. **Build Performance**
   - Initial compilation time: ~13.7s
   - Subsequent compilations: ~2.2s
   - Hot reloads: ~400-700ms
   - Solution: Optimize build configuration and implement proper caching

### Optimization Plan

#### Phase 1: Immediate Optimizations (1-2 days)
- [ ] Fix Firebase initialization to prevent multiple instances
- [ ] Update Tailwind content configuration
- [ ] Implement proper build caching

#### Phase 2: Short-term Optimizations (1 week)
- [ ] Implement proper code splitting
- [ ] Optimize bundle size
- [ ] Add performance monitoring

#### Phase 3: Medium-term Optimizations (2-3 weeks)
- [ ] Implement proper caching strategy
- [ ] Optimize database queries
- [ ] Add performance metrics tracking

#### Phase 4: Long-term Optimizations (1-2 months)
- [ ] Implement proper CDN caching
- [ ] Optimize image loading
- [ ] Add comprehensive performance monitoring

## AI Assistant Directive
When working on this project, focus on maintaining code quality, preventing duplicate components, and ensuring scalability. Prioritize solutions that are both effective and maintainable. Always consider the user experience and performance implications of any changes. When suggesting improvements, explain the benefits and potential trade-offs clearly.

# Shrug

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## User Identification

This application uses a dual-field approach for user identification:

1. **Firebase UID (`firebaseUid`)**: The unique identifier generated by Firebase Authentication
2. **Username (`username`)**: A user-chosen, human-readable identifier

For more details, see the [User Identification Documentation](docs/user-identification.md).

### Running the User ID Migration

To standardize user IDs across the database, run the migration script:

```bash
# Install ts-node if you haven't already
npm install -g ts-node tsconfig-paths

# Run the migration script
npx ts-node -r tsconfig-paths/register src/scripts/runMigration.ts
```

See the [Migration Scripts README](src/scripts/README.md) for more details.

# Scalability Improvement Plan

## The Problem

Our current data structure relies heavily on array-based queries (e.g., `answerUserIds` array) and compound queries that require custom Firestore indexes. This approach:

1. Generates frequent "missing index" errors during development
2. Won't scale well with increasing user activity
3. Requires loading entire documents to access specific user activities
4. Makes pagination difficult and inefficient

## Implementation Plan

### Phase 1: Create Denormalized User Activity Collections

#### 1.1 Define New Data Structures
- Create `userActivities/{userId}/posts/{postId}` structure
- Create `userActivities/{userId}/answers/{answerId}` structure
- Create `userActivities/{userId}/totems/{totemId}` structure

Each document will contain only the essential data needed for user profile views:

```typescript
// User post activity
interface UserPostActivity {
  postId: string;
  question: string;
  createdAt: number;
  lastInteraction: number;
  answerCount: number;
  categories: string[];
}

// User answer activity
interface UserAnswerActivity {
  postId: string;
  answerId: string;
  question: string;
  answerText: string;
  answeredAt: number;
  lastInteraction: number;
}

// User totem activity
interface UserTotemActivity {
  totemId: string;
  totemName: string;
  likedAt: number;
  isActive: boolean;
  lastUpdatedAt: number;
}
```

#### 1.2 Create Migration Script
- Scan existing posts, answers, and totems
- Create corresponding activity documents for each user
- Preserve timestamps and relationships

#### 1.3 Add Index Configuration File
- Create `firestore.indexes.json` with all required indexes
- Set up automatic index deployment

### Phase 2: Update Service Methods

#### 2.1 Modify Write Operations
Update all write operations to keep both primary and denormalized data in sync:

```typescript
// Example: When a user creates a post
async function createPost(postData) {
  const batch = db.batch();
  
  // Add to main posts collection
  const postRef = doc(collection(db, 'posts'));
  batch.set(postRef, postData);
  
  // Add to user's activity
  const userActivityRef = doc(db, `userActivities/${postData.userId}/posts/${postRef.id}`);
  batch.set(userActivityRef, {
    postId: postRef.id,
    question: postData.question,
    createdAt: postData.createdAt,
    lastInteraction: postData.lastInteraction,
    answerCount: 0,
    categories: postData.categories || []
  });
  
  return batch.commit();
}
```

#### 2.2 Use Transaction for Related Updates
For operations that affect multiple users (like answering a post):

```typescript
// When user answers a post
async function createAnswer(postId, answerData) {
  return runTransaction(db, async (transaction) => {
    // Update post
    const postRef = doc(db, 'posts', postId);
    const postDoc = await transaction.get(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }
    
    // Create answer ID
    const answerId = `${postId}_${answerData.userId}_${Date.now()}`;
    
    // Add to user's answers activity
    const userAnswerRef = doc(db, `userActivities/${answerData.userId}/answers/${answerId}`);
    transaction.set(userAnswerRef, {
      postId,
      answerId,
      question: postDoc.data().question,
      answerText: answerData.text,
      answeredAt: Date.now(),
      lastInteraction: Date.now()
    });
    
    // Update post with new answer
    transaction.update(postRef, {
      answers: arrayUnion(answerData),
      answerCount: (postDoc.data().answerCount || 0) + 1,
      answerUserIds: arrayUnion(answerData.userId),
      lastInteraction: Date.now()
    });
    
    // Also update post owner's activity
    const postOwnerId = postDoc.data().userId;
    const postActivityRef = doc(db, `userActivities/${postOwnerId}/posts/${postId}`);
    transaction.update(postActivityRef, {
      answerCount: (postDoc.data().answerCount || 0) + 1,
      lastInteraction: Date.now()
    });
    
    return answerId;
  });
}
```

### Phase 3: Update Query Methods

#### 3.1 Modify Profile Page Queries

Replace complex array-contains queries with direct subcollection queries:

```typescript
// Before: Getting user's answers from posts collection
const postsWithUserAnswers = await getDocs(
  query(
    collection(db, 'posts'),
    where('answerUserIds', 'array-contains', userId),
    orderBy('lastInteraction', 'desc')
  )
);

// After: Getting directly from user activity collection
const userAnswers = await getDocs(
  query(
    collection(db, `userActivities/${userId}/answers`),
    orderBy('lastInteraction', 'desc'),
    limit(10)
  )
);
```

#### 3.2 Implement Efficient Pagination

```typescript
// Initial load
const firstPage = await getDocs(
  query(
    collection(db, `userActivities/${userId}/posts`),
    orderBy('lastInteraction', 'desc'),
    limit(10)
  )
);

// Load more when user scrolls
const lastVisible = firstPage.docs[firstPage.docs.length - 1];

const nextPage = await getDocs(
  query(
    collection(db, `userActivities/${userId}/posts`),
    orderBy('lastInteraction', 'desc'),
    startAfter(lastVisible),
    limit(10)
  )
);
```

### Phase 4: Update UI Components

#### 4.1 Modify Profile Component
- Update to use new data structures
- Implement virtual scrolling for large lists
- Add skeleton loaders for pagination

#### 4.2 Implement Optimistic UI Updates
- Update UI immediately on user actions
- Then confirm with backend response
- Revert on error

### Phase 5: Data Integrity & Maintenance

#### 5.1 Create Consistency Check Script
- Verify primary and denormalized data match
- Fix any discrepancies

#### 5.2 Implement Firestore Rules
- Secure new collections with appropriate rules
- Prevent direct user manipulation of activity collections

#### 5.3 Set Up Monitoring & Alerts
- Monitor read/write costs
- Set up alerts for high usage

## Migration Strategy

### Gradual Rollout
1. Deploy new data structure while maintaining old one
2. Migrate users in batches of 100
3. Monitor performance metrics at each step
4. Roll back mechanism if issues occur

### Fallback Mechanism
- Keep legacy queries as fallback
- If new structure fails, app can temporarily use old queries

## Performance Benefits

- **Read Operations**: ~70% reduction in document size and read operations
- **Write Operations**: Slight increase (~20%) but with better consistency
- **Query Latency**: Expected improvement from 300-500ms to 50-100ms
- **Scalability**: Can support up to 100K+ active users without degradation

## Timeline

- Phase 1: 2 weeks
- Phase 2: 1 week
- Phase 3: 1 week
- Phase 4: 1 week
- Phase 5: 1 week
- Testing & Verification: 1 week

**Total**: 7 weeks

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# SHRUG APP STANDARDIZATION PLAN - v1.6

## PHASE 1: ASSESSMENT & PREPARATION
[✅] 1.1 Database Audit - Completed, identified inconsistent field usage
[✅] 1.2 Code Audit - Found 256 legacy field references in 30 files
[✅] 1.3 User Profile Backup - Successfully backed up 3 user profiles and 29 totems

## PHASE 2: DATA MODEL STANDARDIZATION
[✅] 2.1 Define Standardized Models - Added TimestampedEntity base interface and enhanced models
[✅] 2.2 Create Field Constants - Created constants/fields.ts with comprehensive field naming

## PHASE 3: SERVICE LAYER IMPLEMENTATION
[✅] 3.1 Update UserService - Standardized user methods with compatibility support
[✅] 3.2 Implement PostService - Updated post handling with standard fields
[✅] 3.3 Fix TotemService - Updated with timestamp standards and field constants
[✅] 3.4 Create User ID Helpers - Added utility functions for ID standardization

## PHASE 4: DATABASE CLEANUP & MIGRATION
[✅] 4.1 Clear Posts Collection - Created script to remove and backup posts
[✅] 4.2 Update User Profiles - Created script to migrate to standardized structure

## PHASE 5: CODE UPDATES
[✅] 5.1 Update React Components - Fix field references
  - Created componentHelpers.ts utility functions for consistent field access
  - Updated profile page to use standardized fields and proper identifier detection 
  - Implemented user display utilities that handle both old and new field names
  - Added utility functions to standardize accessing likes, crispness and other fields
[✅] 5.2 Fix Like Functionality - Improve persistence
  - Implemented enhanced like/unlike system with history tracking
  - Added refresh capability for stale likes
  - Updated TotemButton, TotemDetail and PostTotemClient components
  - Improved crispness calculation using likeHistory
[✅] 5.3 Fix Crispness Calculation - Enhance algorithm

## PHASE 6: SCHEMA DOCUMENTATION
[✅] 6.1 Create Schema Documentation - Created user identification documentation

## PHASE 7: TESTING & VERIFICATION
[✅] 7.1 Test User Functionality - Verify profiles work
[✅] 7.2 Test Post Creation - Ensure new posts work
[✅] 7.3 Verify Totem Features - Check discovery
[✅] 7.4 Fix TypeScript errors in totem tests

## PHASE 8: SCALABILITY IMPROVEMENTS
[  ] 8.1 Implement Denormalized Data Structure - Create userActivities collections
[  ] 8.2 Update Write Operations - Sync primary and denormalized data
[  ] 8.3 Optimize Query Methods - Use direct subcollection queries
[  ] 8.4 Update UI Components - Implement pagination and virtual scrolling
[  ] 8.5 Set Up Monitoring - Monitor performance metrics

# DECISION LOG
[2025-03-21] Decided to implement denormalized data structure for user activities
REASON: To improve query performance, reduce index errors, and better scale with increasing user activity

[2025-03-20] Successfully implemented and fixed totem functionality tests
REASON: To verify the enhanced like/unlike system with history tracking and crispness calculation

[2025-03-20] Identified TypeScript compatibility issues in totem test file
REASON: The mock implementations of TotemService functions don't match the actual service interface return types

[2025-03-19] Started development of test suite for totem functionality
REASON: To verify the enhanced like/unlike system with history tracking and ensure crispness calculation works correctly, but encountered type compatibility issues that need to be resolved

[2025-03-19] Added unit tests for post creation and standardization
REASON: To verify that posts are properly created with standardized fields and legacy fields

[2025-03-19] Implemented automated tests for user identification standardization
REASON: To verify that the standardization functionality works correctly and to prevent regressions

[2025-03-18] Decided to entirely clear posts rather than migrate
REASON: No need to preserve test data, cleaner implementation

[2025-03-18] Created robust database and code audit tools
REASON: To ensure thorough understanding of the current state before making changes

[2025-03-18] Enhanced the Totem interface with relationship structure
REASON: Better support for future discovery and connection features

[2025-03-18] Added standardization utility functions in userIdHelpers.ts
REASON: To centralize ID detection and conversion logic for consistency

[2025-03-18] Implemented dual-field approach throughout service layer
REASON: To maintain backward compatibility while moving to new field names

[2025-03-18] Created migration scripts with thorough safety measures
REASON: To protect data integrity with automatic backups and confirmation prompts

[2025-03-18] Created comprehensive user identification documentation
REASON: To provide clear guidance for developers on the dual-field approach

[2025-03-18] Updated crispness calculation to use an average-based approach
REASON: To more accurately represent the freshness of totems based on individual like crispness scores, with a consistent one-week decay period

[2025-03-18] Created componentHelpers.ts utility functions for React components
REASON: To provide a consistent way to access both standardized and legacy fields during the transition period, which simplifies component updates and reduces the risk of regression bugs

[2025-03-18] Updated profile page to use standardized field detection and extraction
REASON: To ensure consistent handling of different user identifier types and provide a smoother user experience

# ISSUE TRACKER
[UNRESOLVED] Firestore index errors on profile page
ISSUE: Compound queries with array-contains and orderBy require custom indexes
SOLUTION: Implement denormalized data structure with direct subcollection queries

[RESOLVED] Firebase config extraction issue
SOLUTION: Created more robust regex-based field extraction instead of JSON parsing

# Shrug Version 1.6

## Standardization Plan

### Phase 1: Planning and Documentation ✅
- 1.1 Define standardized field names ✅
- 1.2 Create constants file for field names ✅
- 1.3 Document data model changes ✅

### Phase 2: Utility Functions ✅
- 2.1 Create user ID helpers ✅
- 2.2 Create timestamp helpers ✅
- 2.3 Add data validation utilities ✅

### Phase 3: Service Layer Updates ✅
- 3.1 Fix UserService ✅
- 3.2 Fix PostService ✅
- 3.3 Fix TotemService ✅

### Phase 4: Database Updates ✅
- 4.1 Clear Posts Collection (Script) ✅
- 4.2 Update User Profiles (Script) ✅

### Phase 5: Client-Side Updates
- 5.1 Update React Components (Fix field references) ✅
  - Created componentHelpers.ts utility functions for consistent field access
  - Updated profile page to use standardized fields and proper identifier detection 
  - Implemented user display utilities that handle both old and new field names
  - Added utility functions to standardize accessing likes, crispness and other fields
- 5.2 Fix Like Functionality (Improve persistence) ✅
  - Implemented enhanced like/unlike system with history tracking
  - Added refresh capability for stale likes
  - Updated TotemButton, TotemDetail and PostTotemClient components
  - Improved crispness calculation using likeHistory
- 5.3 Fix Crispness Calculation (Enhance algorithm) ✅

### Phase 6: Scalability Improvements
- 6.1 Create denormalized user activity collections
- 6.2 Update service methods to maintain both data structures
- 6.3 Implement efficient pagination for profile pages
- 6.4 Create monitoring for database performance

## Decision Log

### v1.6 (Current)
- Implemented comprehensive test suite for user identification functionality
- Added tests to verify component helper functions and field standardization
- Ensured all user identification utilities work with both legacy and standardized fields
- Added test coverage for the integration between various parts of the standardization system
- Added unit tests for post creation and standardization to verify correct field handling
- Completed implementation of totem functionality tests for verifying like/unlike system
- Successfully resolved TypeScript compatibility issues in the test suite
- Added proper type safety with null checks and guards to prevent runtime errors
- Developed plan for scalable data structure to eliminate index errors and improve performance

### v1.5
- Added enhanced like/unlike system with history tracking to preserve original timestamps
- Implemented refresh capability to allow users to refresh stale likes for better crispness scores
- Updated both service layer and client components to support the new functionality
- Created a cleaner architecture for like interactions with proper state management
- Created componentHelpers.ts to standardize field access across React components
- Updated the profile page to handle different user identifier types consistently

### v1.4
- Added task to fix the TotemService implementation
- Completed implementation of TotemService fixes
- Created detailed documentation for user identification

### v1.3
- Added constants file with standardized field names
- Implemented dual-field approach for backward compatibility
- Created utility functions for user ID handling
- Created service implementations for standardized fields

### v1.2
- Identified key areas for standardization
- Documented the project architecture
- Created initial plan for refactoring in phases

## Next Steps

1. Implement denormalized data structure for user activities
2. Gradually migrate to more scalable query patterns
3. Optimize database reads and writes
4. Remove legacy field support in future versions

# TotemButton Implementation Plan

## The Problem

The current implementation of the like functionality (TotemButton) has become overly complex with multiple layers of state management:

1. UI Component State (TotemButton internal state)
2. Parent Component State (QuestionList)
3. Local Storage State (likedTotems.ts)
4. Server State (Firebase)

This complexity has led to synchronization issues, where:
- The like count flashes an update then reverts
- The like status sometimes disagrees between UI and server
- Error handling causes additional state confusion

## Lessons Learned

### Pitfalls to Avoid
- **Over-engineering**: Adding multiple layers of state management made the system fragile
- **Premature optimization**: Using localStorage for state persistence before ensuring the basic functionality works
- **Inconsistent source of truth**: Having both localStorage and Firebase as potential sources of truth created conflicts

### Better Approach

A more maintainable and scalable approach should follow these principles:

1. **Single Source of Truth**: The server (Firebase) should be the definitive record of likes
2. **Simplified State Management**: Use React's state management without additional layers
3. **Clean Optimistic Updates**: Update UI immediately with clear rollback on failure
4. **Real-time Capabilities**: Leverage Firebase's real-time features rather than manual syncing

## Implementation Plan

### Phase 1: Simplify the TotemButton Component

```tsx
<TotemButton
  name="Rain"
  isLiked={false}
  onLike={() => {}}
/>
```

### Phase 2: Create a Clean TotemService

```typescript
// TotemService.ts
export class TotemService {
  // Toggle like status (handles both like and unlike)
  static async toggleLike(postId, totemName, userId) {
    // Get the current post state
    const postRef = doc(db, "posts", postId);
    
    return runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) {
        throw new Error("Post not found");
      }
      
      const post = postDoc.data();
      const answer = findAnswerWithTotem(post.answers, totemName);
      const totem = findTotemInAnswer(answer, totemName);
      
      const isCurrentlyLiked = totem.likedBy?.includes(userId) || false;
      
      // Update totem
      if (isCurrentlyLiked) {
        // Unlike operation
        totem.likedBy = totem.likedBy.filter(id => id !== userId);
        totem.likes = Math.max(0, (totem.likes || 0) - 1);
      } else {
        // Like operation
        totem.likedBy = [...(totem.likedBy || []), userId];
        totem.likes = (totem.likes || 0) + 1;
      }
      
      // Update the post with the modified answer
      transaction.update(postRef, { answers: post.answers });
      
      return {
        success: true,
        post: {
          ...post,
          id: postId,
        },
        isLiked: !isCurrentlyLiked
      };
    });
  }
}
```

### Phase 3: Use React Context for Global State

1. Create a TotemContext to manage liked state across components:

```typescript
const TotemContext = createContext();

export function TotemProvider({ children }) {
  const [likedTotems, setLikedTotems] = useState({});
  const { user } = useAuth();
  
  // Toggle like with optimistic update
  const toggleLike = async (postId, totemName) => {
    if (!user) {
      // Redirect to login or show modal
      return;
    }
    
    const key = `${postId}-${totemName}`;
    const currentlyLiked = likedTotems[key];
    
    // Optimistic update
    setLikedTotems(prev => ({
      ...prev,
      [key]: !currentlyLiked
    }));
    
    try {
      // Server update
      const result = await TotemService.toggleLike(postId, totemName, user.uid);
      
      // Ensure state matches server result
      if (result.isLiked !== !currentlyLiked) {
        setLikedTotems(prev => ({
          ...prev,
          [key]: result.isLiked
        }));
      }
      
      return result;
    } catch (error) {
      // Revert optimistic update on error
      setLikedTotems(prev => ({
        ...prev,
        [key]: currentlyLiked
      }));
      throw error;
    }
  };
  
  // Value to provide
  const value = {
    likedTotems,
    toggleLike
  };
  
  return (
    <TotemContext.Provider value={value}>
      {children}
    </TotemContext.Provider>
  );
}

// Custom hook to use the context
export function useTotem() {
  return useContext(TotemContext);
}
```

## Migration Plan

1. Create a git branch `feature/simplify-totem-likes`
2. Revert the complex changes to how we were before
3. Implement the simplified TotemButton component
4. Create the TotemService with clean Firebase interactions
5. Implement the TotemContext provider
6. Update parent components to use the new context
7. Test thoroughly with different network conditions
8. Deploy incrementally

# Like/Unlike Fix Plan

## Current Issues
- Like button sometimes works, sometimes doesn't
- Unlike button doesn't work at all
- Two different implementations causing confusion

## Solution Steps

### Step 1: Fix Missing Unlike
- Add unlike functionality to `TotemPageClient`
- Use same function that works in `PostTotemClient`
- Simple, safe change without restructuring

### Step 2: Remove Complex Caching
- Remove caching system from `PostTotemClient`
- Use Firebase directly
- Simplify code and improve reliability

### Step 3: Make Components Consistent
- Make both components handle likes/unlikes the same way
- Use same Firebase functions
- Use same error handling

## Progress
- [ ] Step 1: Add unlike functionality to `TotemPageClient`
- [ ] Step 2: Remove complex caching from `PostTotemClient`
- [ ] Step 3: Make components consistent

## Notes
- Keep changes minimal and focused
- Test each step before moving to next
- Don't overcomplicate with unnecessary changes
