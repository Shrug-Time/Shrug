/**
 * Update User Profiles Script
 * 
 * This script updates all user profiles to use standardized field names and structures.
 * It ensures that both old and new field names are present for backward compatibility.
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { getFirebaseConfig } from './firebase-config.js';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize Firebase
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Standardized field mapping
 */
const FIELD_MAPPING = {
  // Core identity
  userID: 'username',
  userId: 'firebaseUid',
  userName: 'name',
  
  // Legacy timestamps that need conversion
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastInteraction: 'lastInteraction'
};

/**
 * Creates a backup of user profiles before updating
 */
async function backupUserProfiles() {
  console.log('Creating backup of user profiles...');
  
  // Create a timestamped directory for the backup
  const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups', `users-backup-${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupPath = path.join(backupDir, 'users.json');
  console.log(`Backup will be saved to: ${backupPath}`);
  
  // Get all users
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  
  if (snapshot.empty) {
    console.log('No users to backup - collection is empty');
    fs.writeFileSync(backupPath, JSON.stringify([]));
    return { count: 0, path: backupPath };
  }
  
  // Extract documents with their IDs
  const users = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Write to file
  fs.writeFileSync(backupPath, JSON.stringify(users, null, 2));
  
  console.log(`Backed up ${users.length} user profiles to ${backupPath}`);
  return { count: users.length, path: backupPath };
}

/**
 * Standardizes a single user profile
 * @param {string} userId The Firestore document ID (Firebase UID)
 * @param {Object} userData Raw user profile data
 * @returns {Object} Standardized user profile data
 */
function standardizeUserProfile(userId, userData) {
  // Make a copy of the user data
  const standardized = { ...userData };

  // Current timestamp
  const now = Date.now();
  
  // Handle core identity fields
  if (!standardized.firebaseUid) {
    standardized.firebaseUid = userId;
  }
  
  if (!standardized.username && standardized.userID) {
    standardized.username = standardized.userID;
  }
  
  if (!standardized.name && standardized.userName) {
    standardized.name = standardized.userName;
  }
  
  // Ensure legacy fields exist for backward compatibility
  if (!standardized.userId) {
    standardized.userId = standardized.firebaseUid || userId;
  }
  
  if (!standardized.userID) {
    standardized.userID = standardized.username || '';
  }
  
  if (!standardized.userName) {
    standardized.userName = standardized.name || '';
  }
  
  // Handle timestamps - convert string timestamps to numbers
  const processTimestamp = (value) => {
    if (value === undefined || value === null) {
      return now;
    }
    
    if (typeof value === 'string') {
      try {
        return new Date(value).getTime();
      } catch (e) {
        return now;
      }
    }
    
    if (typeof value === 'object' && value.seconds) {
      // Firestore Timestamp
      return value.seconds * 1000;
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    return now;
  };
  
  // Process all timestamp fields
  standardized.createdAt = processTimestamp(standardized.createdAt);
  standardized.updatedAt = processTimestamp(standardized.updatedAt) || now;
  standardized.lastInteraction = processTimestamp(standardized.lastInteraction) || now;
  
  // Ensure other required fields exist
  if (!standardized.email) {
    standardized.email = '';
  }
  
  if (!standardized.bio) {
    standardized.bio = '';
  }
  
  if (!standardized.verificationStatus) {
    standardized.verificationStatus = 'unverified';
  }
  
  if (!standardized.membershipTier) {
    standardized.membershipTier = 'free';
  }
  
  if (!standardized.following) {
    standardized.following = [];
  }
  
  if (!standardized.followers) {
    standardized.followers = [];
  }
  
  if (!standardized.totems) {
    standardized.totems = {
      created: [],
      frequently_used: [],
      recent: []
    };
  } else if (typeof standardized.totems === 'object') {
    // Ensure all required totem arrays exist
    if (!standardized.totems.created) standardized.totems.created = [];
    if (!standardized.totems.frequently_used) standardized.totems.frequently_used = [];
    if (!standardized.totems.recent) standardized.totems.recent = [];
  }
  
  if (!standardized.expertise) {
    standardized.expertise = [];
  }
  
  return standardized;
}

/**
 * Updates all user profiles to use standardized fields
 */
async function updateAllUserProfiles() {
  console.log('Starting to update user profiles...');
  
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  
  if (snapshot.empty) {
    console.log('No user profiles to update - collection is empty');
    return 0;
  }
  
  console.log(`Found ${snapshot.docs.length} user profiles to update`);
  
  let updatedCount = 0;
  const batchSize = 500; // Firestore allows up to 500 operations per batch
  
  // Process in batches to avoid hitting limits
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const currentBatch = snapshot.docs.slice(i, i + batchSize);
    
    currentBatch.forEach(docSnapshot => {
      const userId = docSnapshot.id;
      const userData = docSnapshot.data();
      
      // Standardize the user profile
      const standardizedProfile = standardizeUserProfile(userId, userData);
      
      // Add to batch
      batch.update(doc(db, 'users', userId), standardizedProfile);
    });
    
    await batch.commit();
    updatedCount += currentBatch.length;
    console.log(`Updated batch of ${currentBatch.length} profiles (${updatedCount}/${snapshot.docs.length})`);
  }
  
  console.log(`Successfully updated ${updatedCount} user profiles`);
  return updatedCount;
}

/**
 * Updates a single user profile for testing
 * @param {string} userId The user ID to update
 */
async function updateSingleUserProfile(userId) {
  console.log(`Updating single user profile: ${userId}`);
  
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    console.error(`User profile not found: ${userId}`);
    return null;
  }
  
  const userData = userDoc.data();
  console.log('Original user data:', userData);
  
  // Standardize the user profile
  const standardizedProfile = standardizeUserProfile(userId, userData);
  console.log('Standardized user data:', standardizedProfile);
  
  // Update the document
  await updateDoc(userRef, standardizedProfile);
  
  console.log(`Successfully updated user profile: ${userId}`);
  return standardizedProfile;
}

/**
 * Asks for user confirmation
 * @param {string} question Question to ask
 * @returns {Promise<boolean>} Whether the user confirmed
 */
function askForConfirmation(question) {
  return new Promise(resolve => {
    rl.question(`${question} (yes/no): `, answer => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Main function with interactive menu
 */
async function main() {
  try {
    console.log('=== USER PROFILE STANDARDIZATION UTILITY ===');
    console.log('This utility will update user profiles to use standardized fields.');
    console.log('Choose an operation:');
    console.log('1. Update all user profiles');
    console.log('2. Update a single user profile (test mode)');
    console.log('3. Backup user profiles only');
    console.log('4. Exit');
    
    const option = await new Promise(resolve => {
      rl.question('Enter option (1-4): ', answer => {
        resolve(parseInt(answer, 10));
      });
    });
    
    switch (option) {
      case 1: {
        // Update all profiles
        const confirmed = await askForConfirmation(
          'Are you sure you want to update ALL user profiles?'
        );
        
        if (!confirmed) {
          console.log('Operation cancelled by user');
          rl.close();
          return;
        }
        
        // Create backup first
        const backup = await backupUserProfiles();
        
        // Ask for final confirmation
        const finalConfirmation = await askForConfirmation(
          `Backup created with ${backup.count} profiles. Ready to update ALL profiles?`
        );
        
        if (!finalConfirmation) {
          console.log('Operation cancelled by user');
          console.log(`Backup was created at: ${backup.path}`);
          rl.close();
          return;
        }
        
        // Update profiles
        const updatedCount = await updateAllUserProfiles();
        
        console.log('=== OPERATION COMPLETE ===');
        console.log(`Updated ${updatedCount} user profiles`);
        console.log(`Backup saved to: ${backup.path}`);
        break;
      }
      
      case 2: {
        // Update a single profile (test mode)
        const userId = await new Promise(resolve => {
          rl.question('Enter the user ID to update: ', answer => {
            resolve(answer.trim());
          });
        });
        
        if (!userId) {
          console.log('Invalid user ID');
          rl.close();
          return;
        }
        
        // Update the profile
        await updateSingleUserProfile(userId);
        console.log('Test update complete');
        break;
      }
      
      case 3: {
        // Backup only
        const backup = await backupUserProfiles();
        console.log(`Created backup with ${backup.count} profiles at ${backup.path}`);
        break;
      }
      
      case 4:
      default:
        console.log('Exiting...');
        break;
    }
    
    rl.close();
  } catch (error) {
    console.error('An error occurred:', error);
    rl.close();
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { backupUserProfiles, updateAllUserProfiles, updateSingleUserProfile }; 