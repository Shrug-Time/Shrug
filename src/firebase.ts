import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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