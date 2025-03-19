// User Profile Backup Script
// Creates a backup of all user profiles in the Firestore database

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFirebaseConfig } from './firebase-config.js';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Creates a backup of user profiles
 * @returns {Object} Backup results
 */
async function backupUserProfiles() {
  try {
    console.log('Starting user profile backup...');
    
    // Create a timestamped directory for the backup
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const backupDir = path.resolve(process.cwd(), 'backups', `backup-${timestamp}`);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    console.log(`Created backup directory: ${backupDir}`);
    
    // Backup users collection
    const userProfiles = await backupCollection('users', backupDir);
    
    // Backup related collections
    const totems = await backupCollection('totems', backupDir);
    
    // Create a summary file
    const summary = {
      backupDate: new Date().toISOString(),
      collections: {
        users: userProfiles.count,
        totems: totems.count
      },
      backupDirectory: backupDir
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'backup-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('Backup completed successfully!');
    console.log(`Backup saved to: ${backupDir}`);
    
    return {
      success: true,
      backupDir,
      summary
    };
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

/**
 * Backs up a Firestore collection
 * @param {string} collectionName - Name of the collection to backup
 * @param {string} backupDir - Directory to save the backup
 * @returns {Object} Information about the backup
 */
async function backupCollection(collectionName, backupDir) {
  console.log(`Backing up collection: ${collectionName}`);
  
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    if (querySnapshot.empty) {
      console.log(`Collection ${collectionName} is empty`);
      fs.writeFileSync(
        path.join(backupDir, `${collectionName}.json`),
        JSON.stringify([], null, 2)
      );
      
      return { count: 0, success: true };
    }
    
    // Extract documents with their IDs
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Write to file
    fs.writeFileSync(
      path.join(backupDir, `${collectionName}.json`),
      JSON.stringify(documents, null, 2)
    );
    
    console.log(`Backed up ${documents.length} documents from ${collectionName}`);
    
    return {
      count: documents.length,
      success: true
    };
  } catch (error) {
    console.error(`Error backing up ${collectionName}:`, error);
    return {
      count: 0,
      success: false,
      error: error.message
    };
  }
}

// Main execution
async function main() {
  try {
    await backupUserProfiles();
  } catch (error) {
    console.error('User profile backup failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { backupUserProfiles }; 