/**
 * Script to set a user's membership tier to admin
 * Usage: node src/scripts/setAdminStatus.js <firebaseUid>
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getFirebaseConfig } from './firebase-config.js';

// Initialize Firebase
const config = getFirebaseConfig();
const app = initializeApp(config);
const db = getFirestore(app);

async function setAdminStatus(firebaseUid) {
  try {
    console.log(`Setting admin status for user: ${firebaseUid}`);
    
    // Update user document
    const userRef = doc(db, 'users', firebaseUid);
    await updateDoc(userRef, {
      membershipTier: 'admin'
    });
    
    console.log('✅ Successfully updated user to admin status');
    
    // Verify the update
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ Verified membershipTier:', userData.membershipTier);
    }
    
  } catch (error) {
    console.error('❌ Error setting admin status:', error);
  } finally {
    process.exit(0);
  }
}

// Get firebaseUid from command line argument
const firebaseUid = process.argv[2];

if (!firebaseUid) {
  console.error('Please provide a firebaseUid as an argument');
  console.log('Usage: node src/scripts/setAdminStatus.js <firebaseUid>');
  process.exit(1);
}

setAdminStatus(firebaseUid);