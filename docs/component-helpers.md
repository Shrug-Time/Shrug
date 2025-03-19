# Component Helper Functions

## Overview

The `componentHelpers.ts` file provides utility functions to help React components use standardized field names while maintaining backward compatibility during the application's standardization process. These helpers abstract away the complexity of dealing with both new and legacy field names.

## Why Use Component Helpers?

During the standardization process, data in our application will exist in multiple formats:

1. **New data** using standardized field names
2. **Legacy data** using old field names
3. **Hybrid data** with both types of fields during the transition

Component helpers allow you to:

- Write cleaner component code
- Ensure consistent access patterns
- Reduce bugs related to field name inconsistencies
- Make future refactoring easier once standardization is complete

## Available Helper Functions

### User-Related Helpers

#### `getUserDisplayName(obj)`

Gets a user's display name from an object, trying standardized fields first, then legacy fields.

```typescript
import { getUserDisplayName } from '@/utils/componentHelpers';

// In your component:
<div>Posted by {getUserDisplayName(post)}</div>
```

#### `getFirebaseUid(obj)`

Gets a user's Firebase UID from an object, trying standardized fields first, then legacy fields.

```typescript
import { getFirebaseUid } from '@/utils/componentHelpers';

// In your component:
const firebaseUid = getFirebaseUid(user);
```

#### `getUsername(obj)`

Gets a user's username from an object, trying standardized fields first, then legacy fields.

```typescript
import { getUsername } from '@/utils/componentHelpers';

// In your component:
const username = getUsername(user);
```

### Totem-Related Helpers

#### `getTotemLikes(totem)`

Gets a totem's like count, handling both standardized and legacy fields.

```typescript
import { getTotemLikes } from '@/utils/componentHelpers';

// In your component:
<span>Likes: {getTotemLikes(totem)}</span>
```

#### `getTotemCrispness(totem)`

Gets a totem's crispness score, handling both standardized and legacy fields.

```typescript
import { getTotemCrispness } from '@/utils/componentHelpers';

// In your component:
<span>Crispness: {getTotemCrispness(totem)}%</span>
```

#### `hasUserLikedTotem(totem, userId)`

Checks if a user has liked a totem, handling both standardized and legacy fields.

```typescript
import { hasUserLikedTotem } from '@/utils/componentHelpers';

// In your component:
const isLiked = hasUserLikedTotem(totem, currentUserId);
```

## Best Practices

1. **Always use helper functions** instead of direct field access in components
2. **Import only what you need** to keep your component imports clean
3. **Add new helpers** when you find yourself repeating field access patterns
4. **Document new helpers** thoroughly for other developers

## Example: Before and After

### Before (Directly accessing fields):

```tsx
function PostHeader({ post }) {
  return (
    <div className="post-header">
      <h2>{post.question}</h2>
      <p>Posted by {post.name || post.userName || 'Anonymous'}</p>
      <span>Likes: {post.likes || 0}</span>
    </div>
  );
}
```

### After (Using component helpers):

```tsx
import { getUserDisplayName, getTotemLikes } from '@/utils/componentHelpers';

function PostHeader({ post }) {
  return (
    <div className="post-header">
      <h2>{post.question}</h2>
      <p>Posted by {getUserDisplayName(post)}</p>
      <span>Likes: {getTotemLikes(post)}</span>
    </div>
  );
}
```

## Future Plans

Once the standardization process is complete and all legacy fields have been removed from the database, these helper functions will be simplified to directly access the standardized fields. This transition will be transparent to components using the helpers. 