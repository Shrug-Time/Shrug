const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc, orderBy, query } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupDuplicateSections(userId) {
  try {
    console.log(`Cleaning up duplicate sections for user: ${userId}`);
    
    const sectionsRef = collection(db, 'users', userId, 'sections');
    const sectionsQuery = query(sectionsRef, orderBy('position', 'asc'));
    const snapshot = await getDocs(sectionsQuery);
    
    if (snapshot.empty) {
      console.log('No sections found for user');
      return;
    }
    
    const sections = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    
    console.log(`Found ${sections.length} sections:`, sections.map(s => ({ id: s.id, title: s.title, type: s.type })));
    
    // Find duplicates
    const seen = new Map();
    const duplicates = [];
    const uniqueSections = [];
    
    for (const section of sections) {
      const key = `${section.title}-${section.type}`;
      if (!seen.has(key)) {
        seen.set(key, section);
        uniqueSections.push(section);
      } else {
        duplicates.push(section);
      }
    }
    
    if (duplicates.length === 0) {
      console.log('No duplicate sections found');
      return;
    }
    
    console.log(`Found ${duplicates.length} duplicate sections:`, duplicates.map(s => ({ id: s.id, title: s.title, type: s.type })));
    
    // Delete duplicates
    const batch = writeBatch(db);
    duplicates.forEach(section => {
      const sectionRef = doc(db, 'users', userId, 'sections', section.id);
      batch.delete(sectionRef);
      console.log(`Marking section for deletion: ${section.id} (${section.title})`);
    });
    
    await batch.commit();
    console.log(`Successfully deleted ${duplicates.length} duplicate sections`);
    
  } catch (error) {
    console.error('Error cleaning up duplicate sections:', error);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID as an argument');
  console.error('Usage: node cleanupDuplicateSections.js <userId>');
  process.exit(1);
}

cleanupDuplicateSections(userId)
  .then(() => {
    console.log('Cleanup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }); 