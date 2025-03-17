// src/firebase.ts
import { initializeApp, getApps, FirebaseApp, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged, Auth } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, Timestamp, Firestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4fPp7Z9qXw-wSckSUe_B4mJ3vhfxgzdk",
  authDomain: "shrug-cc452.firebaseapp.com",
  projectId: "shrug-cc452",
  storageBucket: "shrug-cc452.firebasestorage.app",
  messagingSenderId: "642784282734",
  appId: "1:642784282734:web:f0009191b880335c7f3e7f"
};

// Enhanced initialization function that works in all contexts
function getFirebaseApp(): FirebaseApp {
  try {
    return getApp();
  } catch (e) {
    console.log('Initializing Firebase app for the first time');
    return initializeApp(firebaseConfig);
  }
}

// Initialize Firebase
const firebaseApp = getFirebaseApp();

// Initialize Firestore and Auth with explicit typing
export const db: Firestore = getFirestore(firebaseApp);
export const auth: Auth = getAuth(firebaseApp);

// Helper functions
export const checkOrCreateUser = async (user: any) => {
  if (!user) return null;
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      email: user.email,
      name: "Default User",
      handle: `user${user.uid.slice(0, 8)}`,
      verificationStatus: user.emailVerified ? 'email_verified' : 'unverified',
      membershipTier: 'free',
      refreshesRemaining: 5,
      refreshResetTime: new Date().toISOString(),
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
      totems: {
        created: [],
        frequently_used: [],
        recent: []
      },
      expertise: []
    });
  } else if (!userDoc.data().verificationStatus.includes('verified') && user.emailVerified) {
    await updateDoc(userRef, { verificationStatus: 'email_verified' });
  }
  return userDoc.data();
};

// Auth functions
export const signIn = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUp = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential;
};

export const onAuthChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const sendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  await sendEmailVerification(user);
};

// Export additional Firebase utilities
export { doc, setDoc, getDoc, updateDoc, Timestamp };