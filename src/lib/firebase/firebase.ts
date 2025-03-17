// Import from the main Firebase file instead of initializing again
import { db, auth } from '@/firebase';

// Export the Firebase services
export { db, auth };

// Verify configuration
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.warn('Environment variables for Firebase configuration are missing. Using hardcoded configuration from src/firebase.ts.');
} 