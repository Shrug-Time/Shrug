# Architecture Documentation

## System Design

### Core Components
1. **Authentication System**
   - Firebase Authentication
   - User session management
   - Protected routes

2. **Data Management**
   - Firebase Firestore
   - Real-time updates
   - Optimistic updates

3. **State Management**
   - React Query for server state
   - Local state for UI
   - Context for global state

## Data Models

### User
```typescript
interface User {
  uid: string;
  email: string;
  name: string;
  handle: string;
  verificationStatus: 'email_verified' | 'unverified';
  membershipTier: 'free' | 'premium';
  refreshesRemaining: number;
  refreshResetTime: string;
  followers: string[];
  following: string[];
  createdAt: string;
  totems: {
    created: string[];
    frequently_used: string[];
    recent: string[];
  };
  expertise: string[];
}
```

### Post
```typescript
interface Post {
  id: string;
  question: string;
  answers: Answer[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  likes: number;
  views: number;
}
```

### Answer
```typescript
interface Answer {
  id: string;
  content: string;
  totems: Totem[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
}
```

### Totem
```typescript
interface Totem {
  name: string;
  likes: number;
  crispness: number;
  likeHistory: {
    userId: string;
    timestamp: string;
    active: boolean;
  }[];
}
```

## Key Workflows

### Like System
1. User clicks like button
2. Frontend optimistically updates UI
3. Backend validates user can like
4. Updates likeHistory array
5. Updates likes count
6. Updates crispness
7. Real-time sync to other clients

### Authentication Flow
1. User signs in/up
2. Firebase authenticates
3. User document created/updated
4. Session established
5. Protected routes accessible

## Performance Considerations
- Optimistic updates for better UX
- Real-time updates only where necessary
- Efficient data structure for likes
- Caching strategies
- Lazy loading of components 