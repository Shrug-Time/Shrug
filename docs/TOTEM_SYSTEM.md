# Totem System Documentation

This document outlines the architecture and best practices for the totem system in the Shrug application.

## Overview

The totem system allows users to add and interact with "totems" on posts. Totems have properties like:
- Name
- Likes
- Crispness (freshness score)
- Like history (who liked it and when)

## Architecture

### Data Flow

1. **UI Components**
   - `TotemButton` - Displays a totem with its name, like count, and crispness
   - `TotemDisplay` - More detailed totem display with additional information
   - `TotemDetail` - Displays a list of posts with a specific totem

2. **Client Components**
   - `PostTotemClient` - Handles totem interactions for a specific post
   - `TotemPageClient` - Handles totem interactions across multiple posts

3. **Services**
   - `TotemService` - Core service for totem operations
     - `handleTotemLike` - Handles liking a totem
     - `updateTotemStats` - Updates totem statistics after a like
     - `calculateCrispness` - Calculates the crispness of a totem

4. **Firebase Functions**
   - `updateTotemLikes` - Wrapper around TotemService.handleTotemLike
   - `refreshTotem` - Recalculates and updates totem crispness

### Authentication

All totem interactions require authentication. The user's ID is used to:
1. Track who has liked a totem
2. Prevent users from liking the same totem multiple times

## Best Practices

### 1. Always Use TotemService for Totem Operations

Always use the `TotemService` class for totem operations. This ensures consistent behavior and proper updating of all totem properties.

```typescript
// GOOD
await TotemService.handleTotemLike(post, answerIdx, totemName, userId);

// BAD - Don't update totem properties directly
await updateDoc(postRef, { 
  answers: post.answers.map(answer => ({
    ...answer,
    totems: answer.totems?.map(totem => 
      totem.name === totemName 
        ? { ...totem, likes: totem.likes + 1 }
        : totem
    )
  }))
});
```

### 2. Always Check Authentication

Always check that the user is authenticated before allowing totem interactions.

```typescript
// GOOD
const userId = auth.currentUser?.uid;
if (!userId) {
  throw new Error("You must be logged in to like a totem");
}

// BAD - Don't assume the user is authenticated
await TotemService.handleTotemLike(post, answerIdx, totemName, "some-user-id");
```

### 3. Always Update Crispness When Likes Change

Crispness should always be recalculated when likes change.

```typescript
// GOOD - TotemService.handleTotemLike handles this automatically
await TotemService.handleTotemLike(post, answerIdx, totemName, userId);

// BAD - Don't update likes without updating crispness
await updateDoc(postRef, { 
  answers: post.answers.map(answer => ({
    ...answer,
    totems: answer.totems?.map(totem => 
      totem.name === totemName 
        ? { ...totem, likes: totem.likes + 1 }
        : totem
    )
  }))
});
```

### 4. Proper Error Handling

Always handle errors properly and provide clear feedback to the user.

```typescript
// GOOD
try {
  await TotemService.handleTotemLike(post, answerIdx, totemName, userId);
} catch (error) {
  console.error("Error liking totem:", error);
  // Show error message to user
}

// BAD - Don't ignore errors
await TotemService.handleTotemLike(post, answerIdx, totemName, userId);
```

### 5. Fetch Updated Data After Operations

After a totem operation, fetch the updated data from the database to ensure the UI reflects the current state.

```typescript
// GOOD
await TotemService.handleTotemLike(post, answerIdx, totemName, userId);
const postRef = doc(db, 'posts', postId);
const postDoc = await getDoc(postRef);
if (postDoc.exists()) {
  setPost(postDoc.data() as Post);
}

// BAD - Don't optimistically update the UI without fetching the current state
await TotemService.handleTotemLike(post, answerIdx, totemName, userId);
setPost(prevPost => ({
  ...prevPost,
  answers: prevPost.answers.map(answer => ({
    ...answer,
    totems: answer.totems?.map(totem => 
      totem.name === totemName 
        ? { ...totem, likes: totem.likes + 1 }
        : totem
    )
  }))
}));
```

## Troubleshooting

### Common Issues

1. **Infinite Liking**
   - Cause: Not checking if the user has already liked the totem
   - Solution: Always use TotemService.handleTotemLike which checks the likedBy array

2. **Crispness Not Updating**
   - Cause: Not recalculating crispness when likes change
   - Solution: Always use TotemService.handleTotemLike which recalculates crispness

3. **UI Not Reflecting Database State**
   - Cause: Optimistically updating the UI without fetching the current state
   - Solution: Fetch the updated data from the database after operations 