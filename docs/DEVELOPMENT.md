# Development Guidelines

## Component Rules

### 1. Component Creation
- Create components in appropriate directories:
  - `common/` for reusable UI components
  - `questions/` for question-related components
  - `totem/` for totem-specific components
- Use TypeScript for all components
- Include proper type definitions
- Document props and their types

### 2. Component Structure
```typescript
// Component template
import { FC } from 'react';

interface ComponentProps {
  // Props interface
}

export const Component: FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  
  return (
    // JSX
  );
};
```

### 3. State Management
- Use React Query for server state
- Use local state for UI-only state
- Use context for truly global state
- Avoid prop drilling

### 4. Performance
- Memoize expensive computations
- Use proper dependency arrays
- Implement proper loading states
- Handle error states gracefully

## Common Patterns

### 1. Data Fetching
```typescript
// Use React Query for data fetching
const { data, isLoading, error } = useQuery(['key'], fetchFunction);
```

### 2. Error Handling
```typescript
// Consistent error handling pattern
try {
  // Operation
} catch (error) {
  console.error('Error:', error);
  // Handle error appropriately
}
```

### 3. Loading States
```typescript
// Loading state pattern
if (isLoading) return <LoadingSpinner />;
```

## Testing Requirements
- Unit tests for utility functions
- Component tests for UI components
- Integration tests for key workflows
- E2E tests for critical paths

## Code Style
- Use ESLint and Prettier
- Follow TypeScript best practices
- Use meaningful variable names
- Write clear comments
- Keep functions small and focused

## Performance Notes
- Implement proper loading states
- Use proper caching strategies
- Optimize bundle size
- Monitor performance metrics
- Use proper image optimization 