// Database Audit Script
// Analyzes Firestore collections to document field names, types, and patterns

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

// Helper function to determine value type with more detail
function getDetailedType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  const basicType = typeof value;
  
  if (basicType === 'object') {
    if (Array.isArray(value)) {
      if (value.length === 0) return 'empty array';
      return `array of ${getDetailedType(value[0])}`;
    }
    
    if (value instanceof Date) return 'Date';
    
    // Check for timestamp-like objects (Firebase Timestamp)
    if (value.seconds !== undefined && value.nanoseconds !== undefined) {
      return 'Firestore Timestamp';
    }
    
    // For regular objects
    return 'object';
  }
  
  return basicType;
}

// Analyze a collection of documents to determine field patterns
function analyzeFields(docs) {
  if (!docs.length) return {};
  
  const fieldStats = {};
  
  // Process each document
  docs.forEach(doc => {
    const data = doc.data();
    
    // Analyze each field in the document
    Object.entries(data).forEach(([key, value]) => {
      if (!fieldStats[key]) {
        fieldStats[key] = {
          count: 0,
          types: {},
          examples: []
        };
      }
      
      // Increment count for this field
      fieldStats[key].count++;
      
      // Track the type of this field
      const type = getDetailedType(value);
      fieldStats[key].types[type] = (fieldStats[key].types[type] || 0) + 1;
      
      // Store an example if we don't have many yet
      if (fieldStats[key].examples.length < 3 && value !== null && value !== undefined) {
        // For objects, store a simplified version
        if (typeof value === 'object' && !Array.isArray(value)) {
          fieldStats[key].examples.push(JSON.stringify(value).substring(0, 100));
        } else {
          fieldStats[key].examples.push(String(value).substring(0, 100));
        }
      }
    });
  });
  
  // Calculate field prevalence (percentage of documents with this field)
  Object.keys(fieldStats).forEach(field => {
    fieldStats[field].prevalence = Math.round((fieldStats[field].count / docs.length) * 100);
  });
  
  return fieldStats;
}

// Main audit function
async function auditDatabase() {
  try {
    console.log('Starting database audit...');
    
    // Collections to audit
    const collectionNames = ['users', 'posts', 'totems'];
    const results = {
      summary: {},
      collections: {}
    };
    
    // Process each collection
    for (const collectionName of collectionNames) {
      console.log(`Auditing ${collectionName} collection...`);
      
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        
        if (querySnapshot.empty) {
          console.log(`Collection ${collectionName} is empty`);
          results.collections[collectionName] = { isEmpty: true };
          continue;
        }
        
        // Get basic collection info
        const docCount = querySnapshot.size;
        console.log(`Found ${docCount} documents in ${collectionName}`);
        
        // Analyze fields
        const fieldAnalysis = analyzeFields(querySnapshot.docs);
        
        // Store results
        results.collections[collectionName] = {
          documentCount: docCount,
          fields: fieldAnalysis
        };
      } catch (error) {
        console.error(`Error auditing ${collectionName}:`, error);
        results.collections[collectionName] = { error: error.message };
      }
    }
    
    // Create summary
    results.summary = {
      auditDate: new Date().toISOString(),
      collectionsAudited: collectionNames,
      totalCollections: collectionNames.length
    };
    
    // Create a timestamped filename
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const outputDir = path.resolve(process.cwd(), 'audits');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `database-audit-${timestamp}.json`);
    
    // Write results to file
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`Audit completed. Results saved to ${outputFile}`);
    
    return results;
  } catch (error) {
    console.error('Audit failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await auditDatabase();
    console.log('Database audit completed successfully');
  } catch (error) {
    console.error('Database audit failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { auditDatabase }; 