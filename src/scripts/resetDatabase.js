/**
 * Simple Database Reset Script
 * 
 * This script directly resets the database without going through the API.
 * Run it with: node src/scripts/resetDatabase.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
try {
  // Look for service account in standard locations
  let serviceAccount;
  const possiblePaths = [
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'firebase-adminsdk.json'),
    path.resolve(process.cwd(), 'firebase-service-account.json')
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log(`Found service account at: ${filePath}`);
      serviceAccount = require(filePath);
      break;
    }
  }

  if (!serviceAccount) {
    console.error('No service account file found. Please create one of:');
    console.error(possiblePaths.join('\n'));
    process.exit(1);
  }

  // Initialize the app
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// Collections to reset
const COLLECTIONS = [
  'users',
  'posts',
  'totems',
  'totem_associations',
  'answers',
  'reports',
  'likes'
];

/**
 * Clear a collection
 */
async function clearCollection(collectionName) {
  console.log(`Clearing collection: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    console.log(`Found ${snapshot.size} documents in ${collectionName}`);
    
    if (snapshot.empty) {
      console.log(`Collection ${collectionName} is already empty`);
      return 0;
    }
    
    // Delete in batches
    const batchSize = 500;
    let batchCount = 0;
    let batch = db.batch();
    let totalDeleted = 0;
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      batchCount++;
      totalDeleted++;
      
      if (batchCount >= batchSize) {
        console.log(`Committing batch of ${batchCount} deletes...`);
        batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    });
    
    // Commit remaining deletes
    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} deletes...`);
      await batch.commit();
    }
    
    console.log(`✅ Deleted ${totalDeleted} documents from ${collectionName}`);
    return totalDeleted;
  } catch (error) {
    console.error(`Error clearing collection ${collectionName}:`, error);
    return -1;
  }
}

/**
 * Reset the database
 */
async function resetDatabase() {
  console.log('🚨 Starting database reset 🚨');
  
  const results = {};
  
  // Get counts before reset
  const beforeCounts = {};
  for (const collectionName of COLLECTIONS) {
    try {
      const snapshot = await db.collection(collectionName).get();
      beforeCounts[collectionName] = snapshot.size;
    } catch (error) {
      console.error(`Error getting count for ${collectionName}:`, error);
      beforeCounts[collectionName] = -1;
    }
  }
  
  console.log('Before counts:', beforeCounts);
  
  // Clear collections
  for (const collectionName of COLLECTIONS) {
    try {
      const deletedCount = await clearCollection(collectionName);
      results[collectionName] = deletedCount;
    } catch (error) {
      console.error(`Error clearing collection ${collectionName}:`, error);
      results[collectionName] = -1;
    }
  }
  
  // Get counts after reset
  const afterCounts = {};
  for (const collectionName of COLLECTIONS) {
    try {
      const snapshot = await db.collection(collectionName).get();
      afterCounts[collectionName] = snapshot.size;
    } catch (error) {
      console.error(`Error getting count for ${collectionName}:`, error);
      afterCounts[collectionName] = -1;
    }
  }
  
  console.log('After counts:', afterCounts);
  console.log('✅ Database reset complete');
  
  return {
    beforeCounts,
    results,
    afterCounts
  };
}

// Run the reset
resetDatabase()
  .then(results => {
    console.log('Reset results:', results);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error resetting database:', error);
    process.exit(1);
  }); 