# Firebase Setup and Configuration

## Current Status
- **Firebase Project**: shrug-cc452
- **Hosting**: Configured but not deployed (awaiting implementation plan)
- **Authentication**: Enabled with Email/Password
- **Firestore**: Enabled with collections for users, posts, and answers
- **GitHub Integration**: Connected to Shrug-Time/Shrug repository

## Environment Variables
The application requires the following Firebase configuration variables in `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Firestore Collections
Current database structure (to be standardized in Phase 1):

- **users**: User profiles and preferences
- **posts**: Questions and metadata
- **answers** (within posts): Responses to questions with totems

## Authentication
- **Methods**: Email/Password authentication
- **Future Plans**: Add social login providers (Google, Apple)

## Deployment Process
GitHub Actions are configured to automatically deploy from the `main` branch to Firebase Hosting.

Manual deployment can be done with:
```bash
npm run build
firebase deploy
```

## Security Rules
Firestore security rules control access with these principles:
- Public read access to posts and answers
- Authenticated users can create posts
- Only authenticated users can like totems
- Users can only edit their own content

## Emulators
Firebase emulators can be used for local development:
```bash
firebase emulators:start
```

## Firebase CLI Configuration
Firebase configuration lives in:
- `firebase.json` - Main configuration file
- `.firebaserc` - Project aliases

## Next Steps
- Complete route standardization in Phase 1
- Update Firestore security rules with new schema
- Set up proper indexes for optimized queries 