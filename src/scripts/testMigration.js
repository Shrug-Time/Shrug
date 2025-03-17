const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  limit, 
  query 
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

// Map to store Firebase UIDs to usernames
const uidToUsernameMap = new Map();
const usernameToUidMap = new Map();

async function buildUserMappings() {
  console.log('Building user ID mappings...');
  
  try {
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, limit(10)); // Limit to 10 users for testing
    const usersSnapshot = await getDocs(usersQuery);
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const firebaseUid = userDoc.id;
      const username = userData.userID || userData.username || `user_${firebaseUid.substring(0, 8)}`;
      
      uidToUsernameMap.set(firebaseUid, username);
      usernameToUidMap.set(username, firebaseUid);
      
      console.log(`Mapped user: ${firebaseUid} -> ${username}`);
    });
    
    console.log(`Built mappings for ${uidToUsernameMap.size} users`);
  } catch (error) {
    console.error('Error building user mappings:', error);
    throw error;
  }
}

async function testUserProfileMigration() {
  console.log('Testing user profile migration...');
  
  try {
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, limit(1)); // Test with just 1 user
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      console.log('No users found for testing');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const firebaseUid = userDoc.id;
    const username = uidToUsernameMap.get(firebaseUid) || userData.userID || `user_${firebaseUid.substring(0, 8)}`;
    
    console.log(`Testing migration for user: ${firebaseUid}`);
    console.log('Before migration:', userData);
    
    const updates = {
      firebaseUid,
      username
    };
    
    // Don't actually update the document in test mode
    // await updateDoc(doc(db, 'users', firebaseUid), updates);
    
    console.log('After migration (simulated):', {
      ...userData,
      ...updates
    });
  } catch (error) {
    console.error('Error testing user profile migration:', error);
  }
}

async function testPostMigration() {
  console.log('Testing post migration...');
  
  try {
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, limit(1)); // Test with just 1 post
    const postsSnapshot = await getDocs(postsQuery);
    
    if (postsSnapshot.empty) {
      console.log('No posts found for testing');
      return;
    }
    
    const postDoc = postsSnapshot.docs[0];
    const postData = postDoc.data();
    
    console.log(`Testing migration for post: ${postDoc.id}`);
    console.log('Before migration:', {
      id: postDoc.id,
      userId: postData.userId,
      userName: postData.userName,
      // Only show a subset of fields for clarity
      answerUserIds: postData.answerUserIds
    });
    
    const updates = {};
    
    // Update creator fields
    if (postData.userId) {
      const firebaseUid = postData.userId;
      const username = uidToUsernameMap.get(firebaseUid) || `user_${firebaseUid.substring(0, 8)}`;
      
      updates.firebaseUid = firebaseUid;
      updates.username = username;
      updates.name = postData.userName || username;
    }
    
    // Update answer user IDs if needed
    if (Array.isArray(postData.answerUserIds)) {
      updates.answerFirebaseUids = postData.answerUserIds;
      updates.answerUsernames = postData.answerUserIds.map(
        (uid) => uidToUsernameMap.get(uid) || `user_${uid.substring(0, 8)}`
      );
    }
    
    // Don't actually update the document in test mode
    // await updateDoc(doc(db, 'posts', postDoc.id), updates);
    
    console.log('After migration (simulated):', {
      id: postDoc.id,
      userId: postData.userId,
      userName: postData.userName,
      firebaseUid: updates.firebaseUid,
      username: updates.username,
      name: updates.name,
      answerUserIds: postData.answerUserIds,
      answerFirebaseUids: updates.answerFirebaseUids,
      answerUsernames: updates.answerUsernames
    });
  } catch (error) {
    console.error('Error testing post migration:', error);
  }
}

async function testMigration() {
  console.log('Starting migration test...');
  
  try {
    await buildUserMappings();
    await testUserProfileMigration();
    await testPostMigration();
    
    console.log('Migration test completed successfully!');
  } catch (error) {
    console.error('Error during migration test:', error);
  }
}

// Run the test
testMigration(); 