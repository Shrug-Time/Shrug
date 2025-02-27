import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAQ8hfHJvvyRTYjItuO5F_3ZqtFRDLmKcU",
    authDomain: "shrug-592ac.firebaseapp.com",
    projectId: "shrug-592ac",
    storageBucket: "shrug-592ac.firebasestorage.app",
    messagingSenderId: "970721163904",
    appId: "1:970721163904:web:23dd7219579ccd3dc8c465",
    measurementId: "G-KJND0F4SY2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);