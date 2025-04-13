/**
 * Database Reset Script
 * 
 * This script resets all collections in the Firestore database.
 * It's meant to be run directly from the command line.
 * 
 * Usage:
 *   node scripts/resetDatabase.js
 * 
 * Make sure you have a service account key file in the project root
 * or set appropriate environment variables.
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const readline = require('readline');

// Collections to reset
const COLLECTIONS_TO_RESET = [
  'users',
  'posts',
  'totems',
  'totem_associations',
  'answers',
  'reports',
  'likes'
];

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  try {
    // Check if environment variables are available
    if (process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_CLIENT_EMAIL && 
        process.env.FIREBASE_PRIVATE_KEY) {
      
      console.log('Initializing Firebase Admin SDK using environment variables...');
      
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace newlines in the private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    }
    
    // Fall back to service account file
    console.log('Trying to load service account from file...');
    
    // Try different possible service account file names
    const possibleFiles = [
      './serviceAccountKey.json',
      './firebase-adminsdk.json',
      './firebase-service-account.json'
    ];
    
    for (const file of possibleFiles) {
      try {
        const serviceAccount = require(file);
        console.log(`Found service account file: ${file}`);
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } catch (e) {
        // File not found or invalid, try next one
      }
    }
    
    throw new Error('No valid service account credentials found. Please check your .env.local file or add a serviceAccountKey.json file to the project root.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
  }
}

// Clear a single collection
async function clearCollection(db, collectionName) {
  console.log(`🧹 Clearing collection: ${collectionName}...`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`Collection ${collectionName} is already empty.`);
      return 0;
    }
    
    let deletedCount = 0;
    const batchSize = 500; // Firestore limits batches to 500 operations
    let batch = db.batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      deletedCount++;
      batchCount++;
      
      // When we reach batch size limit, commit and start a new batch
      if (batchCount >= batchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        console.log(`  Deleted ${deletedCount} documents from ${collectionName} so far...`);
      }
    }
    
    // Commit any remaining deletes
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`✅ Deleted ${deletedCount} documents from ${collectionName}`);
    return deletedCount;
  } catch (error) {
    console.error(`Error clearing collection ${collectionName}:`, error);
    return -1;
  }
}

// Get collection counts
async function getCollectionCounts(db) {
  const counts = {};
  
  for (const collectionName of COLLECTIONS_TO_RESET) {
    try {
      const snapshot = await db.collection(collectionName).get();
      counts[collectionName] = snapshot.size;
    } catch (error) {
      console.error(`Error getting count for ${collectionName}:`, error);
      counts[collectionName] = -1;
    }
  }
  
  return counts;
}

// Format counts for display
function formatCounts(counts) {
  let result = 'Collection Counts:\n';
  
  for (const [collection, count] of Object.entries(counts)) {
    result += `  - ${collection}: ${count}\n`;
  }
  
  return result;
}

// Create a readline interface for user input
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Main function
async function main() {
  console.log('🔥 Firebase Database Reset Script 🔥');
  console.log('====================================');
  
  // Initialize Firebase
  const app = initializeFirebaseAdmin();
  const db = admin.firestore();
  
  // Get current collection counts
  console.log('\nGetting current collection counts...');
  const beforeCounts = await getCollectionCounts(db);
  console.log(formatCounts(beforeCounts));
  
  // Confirm reset
  const rl = createInterface();
  
  const answer = await new Promise(resolve => {
    rl.question('\n⚠️  WARNING: This will delete ALL data in the specified collections! ⚠️\nType "RESET_ALL_DATA" to confirm: ', resolve);
  });
  
  if (answer !== 'RESET_ALL_DATA') {
    console.log('\n❌ Reset cancelled. Database remains unchanged.');
    rl.close();
    process.exit(0);
  }
  
  rl.close();
  
  // Perform reset
  console.log('\n🚀 Starting database reset...');
  const results = {};
  let totalDeleted = 0;
  
  for (const collectionName of COLLECTIONS_TO_RESET) {
    const count = await clearCollection(db, collectionName);
    results[collectionName] = count;
    if (count > 0) totalDeleted += count;
  }
  
  // Get counts after reset
  console.log('\nGetting collection counts after reset...');
  const afterCounts = await getCollectionCounts(db);
  console.log(formatCounts(afterCounts));
  
  // Summary
  console.log('\n✅ Database reset completed!');
  console.log(`Total documents deleted: ${totalDeleted}`);
  
  // Clean exit
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('Error in reset script:', error);
  process.exit(1);
}); 