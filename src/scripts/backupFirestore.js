const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

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

// Create backup directory
const backupDir = path.join(process.cwd(), 'backups', `backup-${new Date().toISOString().replace(/:/g, '-')}`);
fs.mkdirSync(backupDir, { recursive: true });

// Collections to backup
const collectionsToBackup = ['users', 'posts'];

async function backupCollection(collectionName) {
  console.log(`Backing up collection: ${collectionName}`);
  
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    if (querySnapshot.empty) {
      console.log(`Collection ${collectionName} is empty, skipping`);
      return;
    }
    
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    fs.writeFileSync(
      path.join(backupDir, `${collectionName}.json`),
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
    // Backup each collection
    for (const collectionName of collectionsToBackup) {
      await backupCollection(collectionName);
    }
    
    console.log('Backup completed successfully!');
    console.log(`Backup saved to: ${backupDir}`);
  } catch (error) {
    console.error('Error during backup:', error);
  }
}

// Run the backup
backupDatabase(); 