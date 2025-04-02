const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Get Firebase config from your project
const firebaseConfig = {
  apiKey: "AIzaSyC4fPp7Z9qXw-wSckSUe_B4mJ3vhfxgzdk",
  authDomain: "shrug-cc452.firebaseapp.com",
  projectId: "shrug-cc452",
  storageBucket: "shrug-cc452.firebasestorage.app",
  messagingSenderId: "642784282734",
  appId: "1:642784282734:web:f0009191b880335c7f3e7f"
};

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(require('../../serviceAccountKey.json')),
    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  console.log('Make sure you have a serviceAccountKey.json file in the project root.');
  console.log('You can download it from the Firebase Console > Project Settings > Service Accounts.');
  process.exit(1);
}

const db = admin.firestore();
const backupDir = path.join(process.cwd(), 'backups', `backup-${new Date().toISOString().replace(/:/g, '-')}`);

async function backupCollection(collectionName) {
  console.log(`Backing up collection: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`Collection ${collectionName} is empty, skipping`);
      return;
    }
    
    const documents = snapshot.docs.map(doc => ({
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
    const collectionNames = collections.map(collection => collection.id);
    
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