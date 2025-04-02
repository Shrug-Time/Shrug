/**
 * Clear Posts Script
 * 
 * This script clears all posts from the Firestore database.
 * It includes safety measures like confirmation prompts and automatic backup creation.
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  writeBatch,
  query, 
  limit,
  doc,
  deleteDoc
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
 * Backs up the posts collection before clearing
 * @returns {Promise<{ count: number, path: string }>} Backup result
 */
async function backupPosts() {
  console.log('Creating backup of posts collection...');
  
  // Create a timestamped directory for the backup
  const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups', `posts-backup-${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupPath = path.join(backupDir, 'posts.json');
  console.log(`Backup will be saved to: ${backupPath}`);
  
  // Get all posts
  const postsRef = collection(db, 'posts');
  const snapshot = await getDocs(postsRef);
  
  if (snapshot.empty) {
    console.log('No posts to backup - collection is empty');
    fs.writeFileSync(backupPath, JSON.stringify([]));
    return { count: 0, path: backupPath };
  }
  
  // Extract documents with their IDs
  const posts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Write to file
  fs.writeFileSync(backupPath, JSON.stringify(posts, null, 2));
  
  console.log(`Backed up ${posts.length} posts to ${backupPath}`);
  return { count: posts.length, path: backupPath };
}

/**
 * Deletes all posts from Firestore
 * @returns {Promise<number>} Number of deleted posts
 */
async function clearPosts() {
  console.log('Starting to clear posts collection...');
  
  const postsRef = collection(db, 'posts');
  const snapshot = await getDocs(postsRef);
  
  if (snapshot.empty) {
    console.log('No posts to delete - collection is already empty');
    return 0;
  }
  
  let deletedCount = 0;
  const batchSize = 500; // Firestore allows up to 500 operations per batch
  
  // Process in batches to avoid hitting limits
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const currentBatch = snapshot.docs.slice(i, i + batchSize);
    
    currentBatch.forEach(docSnapshot => {
      batch.delete(doc(db, 'posts', docSnapshot.id));
    });
    
    await batch.commit();
    deletedCount += currentBatch.length;
    console.log(`Deleted batch of ${currentBatch.length} posts (${deletedCount}/${snapshot.docs.length})`);
  }
  
  console.log(`Successfully deleted ${deletedCount} posts`);
  return deletedCount;
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
 * Main function
 */
async function main() {
  try {
    console.log('=== POST COLLECTION CLEANUP UTILITY ===');
    console.log('This utility will delete ALL posts from the database.');
    console.log('It will create a backup before deletion.');
    console.log('---');
    
    const confirmed = await askForConfirmation('Are you sure you want to proceed?');
    
    if (!confirmed) {
      console.log('Operation cancelled by user');
      rl.close();
      return;
    }
    
    // Create backup first
    const backup = await backupPosts();
    
    // Ask for final confirmation
    const finalConfirmation = await askForConfirmation(
      `Backup created with ${backup.count} posts. Ready to delete ALL posts?`
    );
    
    if (!finalConfirmation) {
      console.log('Operation cancelled by user');
      console.log(`Backup was created at: ${backup.path}`);
      rl.close();
      return;
    }
    
    // Clear the posts
    const deletedCount = await clearPosts();
    
    console.log('=== OPERATION COMPLETE ===');
    console.log(`Deleted ${deletedCount} posts`);
    console.log(`Backup saved to: ${backup.path}`);
    
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

export { backupPosts, clearPosts }; 