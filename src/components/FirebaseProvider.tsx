import { ReactNode, createContext, useEffect, useState } from 'react';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// Context for Firebase instances
export const FirebaseContext = createContext<{
  db: Firestore | null;
  auth: Auth | null;
  isInitialized: boolean;
}>({
  db: null,
  auth: null,
  isInitialized: false
});

// Props for the Firebase provider component
interface FirebaseProviderProps {
  children: ReactNode;
}

// Component that dynamically imports Firebase only on the client side
export default function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [firebaseState, setFirebaseState] = useState<{
    db: Firestore | null;
    auth: Auth | null;
    isInitialized: boolean;
  }>({
    db: null,
    auth: null,
    isInitialized: false
  });

  useEffect(() => {
    // Only import Firebase in the browser
    const initializeFirebase = async () => {
      try {
        // Dynamic import to prevent SSR issues
        const { db, auth } = await import('../firebase');
        setFirebaseState({
          db,
          auth,
          isInitialized: true
        });
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        setFirebaseState(prev => ({ ...prev, isInitialized: true }));
      }
    };

    initializeFirebase();
  }, []);

  return (
    <FirebaseContext.Provider value={firebaseState}>
      {children}
    </FirebaseContext.Provider>
  );
} 