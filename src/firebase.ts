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

/**
 * Firebase configuration using environment variables
 * Values are loaded from .env.local or environment variables at build time
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate that required environment variables are present
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing required environment variables!');
  console.error('Make sure you have included these in your .env.local file:');
  console.error('  NEXT_PUBLIC_FIREBASE_API_KEY');
  console.error('  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  console.error('  NEXT_PUBLIC_FIREBASE_PROJECT_ID');
}

// Singleton pattern for Firebase initialization
let firebaseApp: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let authInstance: Auth | null = null;

// Initialize Firebase only once, and only in the browser
if (typeof window !== 'undefined') {
  try {
    firebaseApp = getApp();
  } catch (e) {
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
  }
  
  // Initialize Firestore and Auth only once
  firestore = getFirestore(firebaseApp);
  authInstance = getAuth(firebaseApp);
}

// Export initialized instances with type assertions
export const db = firestore as Firestore;
export const auth = authInstance as Auth;

// Initialize social auth providers
const googleProvider = new GoogleAuthProvider();
// Configure Google provider for a better user experience
googleProvider.setCustomParameters({
  // Force account selection even when one account is available
  prompt: 'select_account',
  // Request minimal profile access to speed up the auth process
  login_hint: 'user@example.com',
  // Display in popup mode where possible
  display: 'popup'
});

/**
 * Creates a new user document or updates verification status of existing user
 * @param user The Firebase user object
 * @returns The user document data or null if no user
 */
export const checkOrCreateUser = async (user: User | null): Promise<DocumentData | null> => {
  if (!user) return null;
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
  // Set persistence based on rememberMe flag
  if (auth) {
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
  return onAuthStateChanged(auth, callback);
};

/**
 * Sends a verification email to the currently logged in user
 * @throws Error if no user is logged in
 */
export const sendVerificationEmail = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  await sendEmailVerification(user);
};

/**
 * Signs in a user with Google using a popup window
 * @returns Promise resolving to UserCredential
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
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
    const { signOut } = await import('firebase/auth');
    return signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Export additional Firebase utilities
export { doc, setDoc, getDoc, updateDoc, Timestamp, onSnapshot };