# Schema Standards

This document defines the standard schema definitions and conventions for the Shrug application database. Following these standards ensures data consistency across the application.

## Core Principles

1. **Standardized field naming** across all collections
2. **Consistent timestamp formats** using milliseconds since epoch
3. **Standardized user references** using `firebaseUid`
4. **Strategic denormalization** for query performance
5. **Clear documentation** with TypeScript interfaces
6. **Backward compatibility** with legacy field names

## Common Fields

All entities should include these common timestamp fields:

| Field | Type | Description |
|-------|------|-------------|
| `createdAt` | `number` | Milliseconds since epoch when the entity was created |
| `updatedAt` | `number` | Milliseconds since epoch when the entity was last updated |
| `lastInteraction` | `number` | Milliseconds since epoch of the most recent interaction |

## User Identification

User references must use the following standardized fields:

| Field | Type | Description |
|-------|------|-------------|
| `firebaseUid` | `string` | Primary identifier from Firebase Authentication |
| `username` | `string` | User's chosen username |
| `name` | `string` | User's display name |

Legacy fields (`userId`, `userID`, `userName`) are supported for backward compatibility but should be phased out.

## Collection Schemas

### Users Collection

```typescript
interface UserProfile {
  // Core identity fields (standardized)
  firebaseUid: string;
  username: string;
  name: string;
  
  // Profile content
  email: string;
  bio?: string;
  photoURL?: string;
  
  // Status fields
  verificationStatus: 'unverified' | 'email_verified' | 'identity_verified';
  membershipTier: 'free' | 'basic' | 'premium';
  
  // Usage limits
  refreshesRemaining: number;
  refreshResetTime: string;
  
  // Social connections
  followers: string[];  // Array of firebaseUids
  following: string[];  // Array of firebaseUids
  
  // Totem relationships
  totems: {
    created: string[];
    frequently_used: string[];
    recent: string[];
  };
  
  // Expertise
  expertise: {
    category: string;
    level: number;
  }[];
  
  // Common fields
  createdAt: number;
  updatedAt: number;
  lastInteraction: number;
}
```

### Posts Collection

```typescript
interface Post {
  id: string;
  question: string;
  
  // Standardized user fields
  firebaseUid: string;
  username: string;
  name: string;
  
  // Content categorization
  categories: string[];
  
  // Enhanced totem connection
  totemAssociations: {
    totemId: string;
    totemName: string;
    relevanceScore: number; // 0-100
    appliedBy: string; // firebaseUid who applied this totem
    appliedAt: number; // timestamp
    endorsedBy: string[]; // firebaseUids who agree with this totem
    contestedBy: string[]; // firebaseUids who disagree with this totem
  }[];
  
  // Engagement metrics
  score?: number;
  
  // Answers
  answers: Answer[];
  answerFirebaseUids: string[];
  answerUsernames: string[];
  
  // Common fields
  createdAt: number;
  updatedAt: number;
  lastInteraction: number;
}
```

### Answers (embedded in Posts)

```typescript
interface Answer {
  id: string;
  text: string;
  
  // Standardized user fields
  firebaseUid: string;
  username: string;
  name: string;
  
  // Associated totems
  totems: Totem[];
  
  // Status indicators
  isVerified?: boolean;
  isPremium?: boolean;
  
  // Common fields
  createdAt: number;
  updatedAt: number;
  lastInteraction: number;
}
```

### Totems Collection

```typescript
interface Totem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  
  // Like history
  likeHistory: {
    userId: string; // firebaseUid
    originalTimestamp: number;
    lastUpdatedAt: number;
    isActive: boolean;
    value?: number;
  }[];
  
  // Properties
  crispness: number;
  category: {
    id: string;
    name: string;
    description: string;
    parentId?: string;
    children: string[];
    usageCount: number;
  };
  decayModel: 'FAST' | 'MEDIUM' | 'NONE';
  usageCount: number;
  
  // Enhanced relationship structure
  relationships?: {
    totemId: string;
    relationshipType: 'related' | 'parent' | 'child' | 'similar' | 'opposite';
    strength: number; // 0-100 indicating relationship strength
    sourcesCount: number; // How many sources established this relationship
  }[];
  
  // Common fields
  createdAt: number;
  updatedAt: number;
  lastInteraction: number;
}
```

## Data Validation Rules

1. **Required fields**: `id`, `firebaseUid`, timestamps, and entity-specific required fields cannot be null or empty
2. **String fields**: Must be trimmed, no leading/trailing spaces
3. **Timestamps**: All timestamps must be stored as numeric milliseconds since epoch
4. **Arrays**: Must not contain null or undefined values
5. **User references**: Must use `firebaseUid` for identifying users
6. **Embedded objects**: Must follow their own schema rules

## Conversion Utilities

The application should standardize incoming data through the following approaches:

1. Use service layer functions to standardize fields on read/write
2. Implement automatic type conversion for timestamps
3. Follow naming conventions consistently

## Implementation Guidelines

When implementing this schema:

1. Update TypeScript interfaces in `src/types/models.ts`
2. Use standardized field constants from `src/constants/fields.ts`
3. Create validation functions for each entity type
4. Implement automatic field mapping for backward compatibility
5. Document any schema migrations or changes 