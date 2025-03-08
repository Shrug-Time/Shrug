// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC4fPp7Z9qXw-wSckSUe_B4mJ3vhfxgzdk",
  authDomain: "shrug-cc452.firebaseapp.com",
  projectId: "shrug-cc452",
  storageBucket: "shrug-cc452.firebasestorage.app",
  messagingSenderId: "642784282734",
  appId: "1:642784282734:web:f0009191b880335c7f3e7f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const checkOrCreateUser = async (user: any) => {
  if (!user) return null;
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      email: user.email,
      name: "Default User",
      handle: `user${user.uid.slice(0, 8)}`,
      verified: user.emailVerified || false,
      createdAt: new Date().toISOString(),
    });
  } else if (!userDoc.data().verified && user.emailVerified) {
    await updateDoc(userRef, { verified: true });
  }
  return userDoc.data() || { verified: user.emailVerified || false };
};

export const createUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await checkOrCreateUser(user);
    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const setupAuthListener = (callback: (userData: any) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const data = await checkOrCreateUser(user);
      callback(data);
    } else {
      callback(null);
    }
  });
};