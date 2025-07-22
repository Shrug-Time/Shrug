// This file is dynamically modified during build to prevent SSR issues
// This file is dynamically modified during build to prevent SSR issues

// This file is dynamically modified during build to prevent SSR issues

// This file is dynamically modified during build to prevent SSR issues

// This file is dynamically modified during build to prevent SSR issues

// This file is dynamically modified during build to prevent SSR issues

// This file is dynamically modified during build to prevent SSR issues
// src/firebase.ts
import { initializeApp, getApps, FirebaseApp, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  onAuthStateChanged, 
  Auth, 
  User, 
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, Timestamp, Firestore, onSnapshot, DocumentData, DocumentReference } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

/**
 * Firebase configuration using environment variables
 * Values are loaded from .env.local or environment variables at build time
 */
// Only initialize Firebase in the browser environment
const isBrowser = typeof window !== 'undefined';

// Firebase app instances
let firebaseApp: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Initialize Firebase only in browser environment
if (isBrowser) {
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    // Check if required config values exist
    const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.authDomain && !!firebaseConfig.projectId;

    if (isConfigValid) {
      // Initialize Firebase only once
      firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
      firestore = getFirestore(firebaseApp);
      authInstance = getAuth(firebaseApp);
      storageInstance = getStorage(firebaseApp);

      // Initialize Google provider
      googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({
        prompt: 'select_account',
        login_hint: 'user@example.com',
        display: 'popup'
      });
    } else {
      console.error('Firebase configuration is missing required environment variables!');
      console.error('Make sure you have included these in your .env.local file:');
      console.error('  NEXT_PUBLIC_FIREBASE_API_KEY');
      console.error('  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
      console.error('  NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Export initialized instances with null fallbacks to prevent runtime errors
export const db = firestore;
export const storage = storageInstance;
export const auth = authInstance;

/**
 * Creates a new user document or updates verification status of existing user
 * @param user The Firebase user object
 * @returns The user document data or null if no user
 */
export const checkOrCreateUser = async (user: User | null): Promise<DocumentData | null> => {
  if (!user || !db) return null;
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    const timestamp = Date.now();
    await setDoc(userRef, {
      email: user.email,
      name: "Default User",
      handle: `user${user.uid.slice(0, 8)}`,
      verificationStatus: user.emailVerified ? 'email_verified' : 'unverified',
      membershipTier: 'free',
      refreshesRemaining: 5,
      refreshResetTime: timestamp,
      followers: [],
      following: [],
      firebaseUid: user.uid, // Standardized user ID field
      createdAt: timestamp,
      updatedAt: timestamp,
      totems: {
        created: [],
        frequently_used: [],
        recent: []
      },
      expertise: []
    });
    // Get the updated document after creation
    return (await getDoc(userRef)).data() || null;
  } else if (!userDoc.data().verificationStatus.includes('verified') && user.emailVerified) {
    await updateDoc(userRef, { 
      verificationStatus: 'email_verified',
      updatedAt: Date.now()
    });
  }
  // Return the data with a null fallback if undefined
  return userDoc.data() || null;
};

/**
 * Signs in a user with email and password
 * @param email User's email address
 * @param password User's password
 * @param rememberMe Whether to persist the user session
 * @returns Firebase UserCredential object
 */
export const signIn = async (email: string, password: string, rememberMe: boolean = false): Promise<UserCredential> => {
  if (!auth) throw new Error("Auth is not initialized");
  
  // Set persistence based on rememberMe flag
  if (isBrowser) {
    const { setPersistence, browserSessionPersistence, browserLocalPersistence } = await import('firebase/auth');
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  }
  
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Creates a new user account and sends verification email
 * @param email User's email address
 * @param password User's password
 * @returns Firebase UserCredential object
 */
export const signUp = async (email: string, password: string): Promise<UserCredential> => {
  if (!auth) throw new Error("Auth is not initialized");
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential;
};

/**
 * Sets up an auth state change listener
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
  if (!auth) throw new Error("Auth is not initialized");
  return onAuthStateChanged(auth, callback);
};

/**
 * Sends a verification email to the currently logged in user
 * @throws Error if no user is logged in
 */
export const sendVerificationEmail = async (): Promise<void> => {
  if (!auth) throw new Error("Auth is not initialized");
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  await sendEmailVerification(user);
};

/**
 * Signs in a user with Google using a popup window
 * @returns Promise resolving to UserCredential
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  if (!auth || !googleProvider) throw new Error("Auth or Google provider is not initialized");
  
  try {
    // Force the prompt to stay in a popup
    googleProvider.setCustomParameters({
      prompt: 'select_account',
      display: 'popup'
    });
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    // Check if the error is because popup was blocked
    if (error.code === 'auth/popup-blocked') {
      console.error('Popup was blocked by the browser. Please allow popups for this site.');
      throw new Error('Popup was blocked. Please allow popups for this site and try again.');
    }
    throw error;
  }
};

/**
 * Gets the result from a redirect sign-in operation
 * @returns UserCredential or null if no redirect result
 */
export const getAuthRedirectResult = async (): Promise<UserCredential | null> => {
  if (!auth) throw new Error("Auth is not initialized");
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error("Error getting redirect result:", error);
    return null;
  }
};

/**
 * Signs out the currently authenticated user
 * @returns Promise that resolves when sign-out is complete
 */
export const signOut = async (): Promise<void> => {
  try {
    if (!auth) {
      throw new Error('Firebase auth is not initialized');
    }
    const { signOut } = await import('firebase/auth');
    return signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Export additional Firebase utilities
export { doc, setDoc, getDoc, updateDoc, Timestamp, onSnapshot };






