// Test database connection and totems collection
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

// Firebase config (you'll need to add your actual config here)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing Database Connection...\n');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase initialized successfully');
    
    // Test totems collection
    console.log('\n1. Testing totems collection...');
    const totemsRef = collection(db, 'totems');
    const totemsQuery = query(totemsRef, limit(10));
    const totemsSnapshot = await getDocs(totemsQuery);
    
    console.log(`Found ${totemsSnapshot.docs.length} totems`);
    
    if (totemsSnapshot.docs.length > 0) {
      console.log('Sample totem data:');
      totemsSnapshot.docs.slice(0, 3).forEach((doc, index) => {
        console.log(`Totem ${index + 1}:`, {
          id: doc.id,
          data: doc.data()
        });
      });
    }
    
    // Test users collection
    console.log('\n2. Testing users collection...');
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, limit(10));
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log(`Found ${usersSnapshot.docs.length} users`);
    
    if (usersSnapshot.docs.length > 0) {
      console.log('Sample user data:');
      usersSnapshot.docs.slice(0, 2).forEach((doc, index) => {
        console.log(`User ${index + 1}:`, {
          id: doc.id,
          data: doc.data()
        });
      });
    }
    
    // Test posts collection
    console.log('\n3. Testing posts collection...');
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, limit(10));
    const postsSnapshot = await getDocs(postsQuery);
    
    console.log(`Found ${postsSnapshot.docs.length} posts`);
    
    if (postsSnapshot.docs.length > 0) {
      console.log('Sample post data:');
      postsSnapshot.docs.slice(0, 2).forEach((doc, index) => {
        console.log(`Post ${index + 1}:`, {
          id: doc.id,
          question: doc.data().question,
          answersCount: doc.data().answers?.length || 0
        });
      });
    }
    
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  }
}

// Run the test
testDatabaseConnection(); 