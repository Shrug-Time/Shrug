import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * This script creates a backup of the Firestore database
 * by exporting all collections to JSON files.
 */

// Initialize Firebase Admin with your service account
// You need to have a service account key file
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  process.exit(1);
}

const db = admin.firestore();
const backupDir = path.join(process.cwd(), 'backups', `backup-${new Date().toISOString().replace(/:/g, '-')}`);

async function backupCollection(collectionName: string) {
  console.log(`Backing up collection: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`Collection ${collectionName} is empty, skipping`);
      return;
    }
    
    const documents = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const collectionDir = path.join(backupDir, collectionName);
    fs.mkdirSync(collectionDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(collectionDir, 'data.json'),
      JSON.stringify(documents, null, 2)
    );
    
    console.log(`Backed up ${documents.length} documents from ${collectionName}`);
  } catch (error) {
    console.error(`Error backing up collection ${collectionName}:`, error);
  }
}

async function backupDatabase() {
  console.log('Starting database backup...');
  
  try {
    // Create backup directory
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Get all collections
    const collections = await db.listCollections();
    const collectionNames = collections.map((collection: admin.firestore.CollectionReference) => collection.id);
    
    console.log(`Found ${collectionNames.length} collections to backup`);
    
    // Backup each collection
    for (const collectionName of collectionNames) {
      await backupCollection(collectionName);
    }
    
    console.log('Backup completed successfully!');
    console.log(`Backup saved to: ${backupDir}`);
  } catch (error) {
    console.error('Error during backup:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the backup
backupDatabase(); 