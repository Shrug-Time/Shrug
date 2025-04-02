const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch 
} = require('firebase/firestore');

// Firebase configuration from your project
const firebaseConfig = {
  apiKey: "AIzaSyC4fPp7Z9qXw-wSckSUe_B4mJ3vhfxgzdk",
  authDomain: "shrug-cc452.firebaseapp.com",
  projectId: "shrug-cc452",
  storageBucket: "shrug-cc452.firebasestorage.app",
  messagingSenderId: "642784282734",
  appId: "1:642784282734:web:f0009191b880335c7f3e7f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Migration script to standardize user IDs across the database
 * 
 * This script:
 * 1. Updates all user profiles to use the new field names
 * 2. Updates all posts to use the new field names
 * 3. Ensures consistency between collections
 */
async function migrateUserIds() {
  console.log('Starting user ID migration...');
  
  // Step 1: Create a mapping of Firebase UIDs to usernames
  const uidToUsernameMap = new Map();
  const usernameToUidMap = new Map();
  
  console.log('Building user ID mappings...');
  const usersRef = collection(db, 'users');
  const usersSnapshot = await getDocs(usersRef);
  
  usersSnapshot.forEach(userDoc => {
    const userData = userDoc.data();
    const firebaseUid = userDoc.id;
    
    // Handle different field names based on what we found in testing
    const username = userData.userID || userData.userId || userData.username || `user_${firebaseUid.substring(0, 8)}`;
    
    uidToUsernameMap.set(firebaseUid, username);
    usernameToUidMap.set(username, firebaseUid);
    
    console.log(`Mapped user: ${firebaseUid} -> ${username}`);
  });
  
  // Step 2: Update user profiles
  console.log('Updating user profiles...');
  const userBatch = writeBatch(db);
  let userCount = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const firebaseUid = userDoc.id;
    const username = uidToUsernameMap.get(firebaseUid) || userData.userID || userData.userId || `user_${firebaseUid.substring(0, 8)}`;
    
    const updates = {
      firebaseUid,
      username
    };
    
    // Use the existing name if available
    if (userData.name) {
      updates.name = userData.name;
    } else if (userData.displayName) {
      updates.name = userData.displayName;
    } else {
      updates.name = username;
    }
    
    // Remove old fields if they exist
    if (userData.userID !== undefined) {
      updates.userID = null; // This will be removed in Firestore
    }
    
    if (userData.userId !== undefined && userData.userId !== firebaseUid) {
      updates.userId = null; // This will be removed in Firestore
    }
    
    userBatch.update(doc(db, 'users', firebaseUid), updates);
    userCount++;
    
    // Firestore batches are limited to 500 operations
    if (userCount >= 450) {
      await userBatch.commit();
      console.log(`Committed batch of ${userCount} user updates`);
      userCount = 0;
    }
  }
  
  if (userCount > 0) {
    await userBatch.commit();
    console.log(`Committed final batch of ${userCount} user updates`);
  }
  
  // Step 3: Update posts
  console.log('Updating posts...');
  const postsRef = collection(db, 'posts');
  const postsSnapshot = await getDocs(postsRef);
  
  const postBatch = writeBatch(db);
  let postCount = 0;
  
  for (const postDoc of postsSnapshot.docs) {
    const postData = postDoc.data();
    const updates = {};
    
    // Update creator fields
    if (postData.userId) {
      const firebaseUid = postData.userId;
      const username = uidToUsernameMap.get(firebaseUid) || `user_${firebaseUid.substring(0, 8)}`;
      
      updates.firebaseUid = firebaseUid;
      updates.username = username;
      updates.name = postData.userName || username;
      
      // Don't remove userId yet for backward compatibility
      // updates.userId = null;
      // updates.userName = null;
    }
    
    // Update answer user IDs if needed
    if (Array.isArray(postData.answers)) {
      const updatedAnswers = postData.answers.map((answer) => {
        if (answer.userId) {
          const firebaseUid = answer.userId;
          const username = uidToUsernameMap.get(firebaseUid) || `user_${firebaseUid.substring(0, 8)}`;
          
          return {
            ...answer,
            firebaseUid,
            username,
            name: answer.userName || username,
            // Don't remove old fields yet for backward compatibility
            // userId: null,
            // userName: null
          };
        }
        return answer;
      });
      
      updates.answers = updatedAnswers;
      
      // Update answerUserIds array with firebaseUids
      if (Array.isArray(postData.answerUserIds)) {
        updates.answerFirebaseUids = postData.answerUserIds;
        updates.answerUsernames = postData.answerUserIds.map(
          (uid) => uidToUsernameMap.get(uid) || `user_${uid.substring(0, 8)}`
        );
        // Don't remove old fields yet for backward compatibility
        // updates.answerUserIds = null;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      postBatch.update(doc(db, 'posts', postDoc.id), updates);
      postCount++;
      
      // Firestore batches are limited to 500 operations
      if (postCount >= 450) {
        await postBatch.commit();
        console.log(`Committed batch of ${postCount} post updates`);
        postCount = 0;
      }
    }
  }
  
  if (postCount > 0) {
    await postBatch.commit();
    console.log(`Committed final batch of ${postCount} post updates`);
  }
  
  console.log('Migration completed successfully!');
}

/**
 * This script runs the user ID migration.
 * 
 * To run this script:
 * 1. Make sure you have the necessary Firebase permissions
 * 2. Run: node src/scripts/runMigration.js
 */
async function main() {
  console.log('Starting user ID migration process...');
  
  try {
    await migrateUserIds();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
main(); 