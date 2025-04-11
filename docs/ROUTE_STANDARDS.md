# Route Standards

This document outlines the standardized routing patterns for the Shrug application. All routes should follow these patterns to ensure consistency across the codebase.

## Principles

1. **Always use route utility functions** instead of hardcoding routes or URLs in components
2. **Consistent naming patterns** for all route parameters
3. **Semantic routing structure** that reflects the application's data hierarchy
4. **Search parameters** follow consistent patterns
5. **Route transitions** are handled consistently

## Route Utility Functions

All routing should be done through the utility functions in `src/utils/routes.ts`. These functions ensure consistency and make it easier to change route patterns later if needed.

| Function | Description | Return Value |
|----------|-------------|--------------|
| `getHomeUrl()` | Generate URL to the home/feed page | `/` |
| `getPostUrl(postId)` | Generate URL to view a single post/question | `/post/${postId}` |
| `getAnswerUrl(postId, answerId)` | Generate URL to view a specific answer to a post | `/post/${postId}/answers/${answerId}` |
| `getTotemUrl(postId, totemName)` | Generate URL to view a specific totem for a post | `/post/${postId}/totem/${totemName}` |
| `getProfileUrl(userId)` | Generate URL to a user's profile | `/profile/${userId}` |
| `getSearchUrl(query?)` | Generate URL to the search page | `/search` or `/search?q=${query}` |
| `getNewPostUrl()` | Generate URL to create a new post | `/post/new` |
| `getCreateAnswerUrl(postId)` | Generate URL to create an answer to a post | `/post/${postId}/answer` |
| `getSettingsUrl()` | Generate URL to user settings | `/settings` |
| `getProfileSettingsUrl()` | Generate URL to profile settings | `/settings/profile` |
| `getAdminReportsUrl()` | Generate URL to admin reports page | `/admin/reports` |

## Usage Guidelines

1. **Never hardcode routes** - Always use the utility functions
2. **Use Next.js Link components** for client-side navigation
3. **Use router.push()** for programmatic navigation
4. **Encode parameters properly** when needed (the utility functions handle this)

## Examples

```tsx
// Good - Using utility functions
import { getPostUrl, getProfileUrl } from '@/utils/routes';

// In a component
<Link href={getPostUrl(post.id)}>View Question</Link>

// For programmatic navigation
router.push(getProfileUrl(user.id));

// Bad - Hardcoding routes
<Link href={`/post/${post.id}`}>View Question</Link>
router.push(`/profile/${user.id}`);
```

## Standardized Route Structure

- `/` - Home/feed page
- `/post/${postId}` - View a specific post/question
- `/post/${postId}/answers/${answerId}` - View a specific answer
- `/post/${postId}/totem/${totemName}` - View a specific totem for a post 
- `/post/${postId}/answer` - Create an answer to a post
- `/post/new` - Create a new post
- `/profile/${userId}` - View a user's profile
- `/search` - Search page
- `/settings` - User settings
- `/settings/profile` - Profile settings
- `/admin/reports` - Admin reports page 