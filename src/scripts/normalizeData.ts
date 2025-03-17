/**
 * Data Normalization Script
 * 
 * This script normalizes user ID fields in Firestore documents.
 * It can be run as a one-time operation or scheduled to run periodically.
 * 
 * Usage:
 * - Run with dry run mode: ts-node src/scripts/normalizeData.ts --dry-run
 * - Run with production mode: ts-node src/scripts/normalizeData.ts --production
 * - Specify collection: ts-node src/scripts/normalizeData.ts --collection=posts
 * - Specify batch size: ts-node src/scripts/normalizeData.ts --batch-size=50
 */

import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  limit, 
  startAfter, 
  DocumentData,
  DocumentSnapshot,
  writeBatch,
  doc,
  Query,
  QuerySnapshot
} from 'firebase/firestore';
import { normalizeUserIdFields } from '../utils/dataNormalization';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--production');
const collectionName = args.find(arg => arg.startsWith('--collection='))?.split('=')[1] || 'posts';
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1];
const batchSize = batchSizeArg ? parseInt(batchSizeArg, 10) : 100;

console.log(`
Data Normalization Script
-------------------------
Collection: ${collectionName}
Batch Size: ${batchSize}
Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}
`);

// Confirmation in production mode
if (!dryRun) {
  console.log('\x1b[31m%s\x1b[0m', 'WARNING: Running in PRODUCTION mode. Data will be modified.');
  console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');
  
  // Wait for 5 seconds before proceeding
  new Promise(resolve => setTimeout(resolve, 5000)).then(runNormalization);
} else {
  console.log('\x1b[33m%s\x1b[0m', 'Running in DRY RUN mode. No data will be modified.');
  runNormalization();
}

async function runNormalization() {
  try {
    const collectionRef = collection(db, collectionName);
    let lastDoc: DocumentSnapshot | null = null;
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    console.log('Starting normalization process...');
    
    // Process documents in batches
    while (true) {
      // Create query for the next batch
      const batchQuery: Query<DocumentData> = lastDoc 
        ? query(collectionRef, startAfter(lastDoc), limit(batchSize))
        : query(collectionRef, limit(batchSize));
      
      // Get documents
      const batchSnapshot: QuerySnapshot<DocumentData> = await getDocs(batchQuery);
      
      if (batchSnapshot.empty) {
        console.log('No more documents to process.');
        break;
      }
      
      // Update the last document for pagination
      lastDoc = batchSnapshot.docs[batchSnapshot.docs.length - 1];
      
      // Process batch
      const batch = writeBatch(db);
      let batchChanges = 0;
      
      for (const docSnapshot of batchSnapshot.docs) {
        processedCount++;
        
        try {
          const originalData = docSnapshot.data();
          const normalizedData = normalizeUserIdFields(originalData);
          
          // Check if any changes were made
          const hasChanges = JSON.stringify(originalData) !== JSON.stringify(normalizedData);
          
          if (hasChanges) {
            if (!dryRun) {
              batch.update(doc(db, collectionName, docSnapshot.id), normalizedData);
            }
            updatedCount++;
            batchChanges++;
            
            // Log the changes
            console.log(`[${dryRun ? 'DRY RUN' : 'UPDATE'}] Document ${docSnapshot.id} would be updated`);
            
            // Log field changes for debugging
            const fieldChanges: Record<string, { from: any, to: any }> = {};
            for (const key in normalizedData) {
              if (JSON.stringify(originalData[key]) !== JSON.stringify(normalizedData[key])) {
                fieldChanges[key] = {
                  from: originalData[key],
                  to: normalizedData[key]
                };
              }
            }
            console.log('Field changes:', fieldChanges);
          }
        } catch (error) {
          console.error(`Error processing document ${docSnapshot.id}:`, error);
          errorCount++;
        }
      }
      
      // Commit the batch if changes were made and not in dry run mode
      if (batchChanges > 0 && !dryRun) {
        try {
          await batch.commit();
          console.log(`Batch update committed for ${batchChanges} documents`);
        } catch (error) {
          console.error('Error committing batch:', error);
          errorCount += batchChanges;
          updatedCount -= batchChanges;
        }
      }
      
      // Log progress
      console.log(`Processed ${processedCount} documents, updated ${updatedCount}, errors ${errorCount}`);
    }
    
    // Log final results
    console.log(`
Normalization Complete
---------------------
Collection: ${collectionName}
Total Processed: ${processedCount}
Total Updated: ${updatedCount}
Total Errors: ${errorCount}
Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}
`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
} 