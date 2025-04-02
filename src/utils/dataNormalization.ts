/**
 * Utilities for normalizing data structures in Firestore
 */
import { db } from '@/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch, 
  query, 
  limit,
  DocumentData
} from 'firebase/firestore';

/**
 * Standardizes user ID fields in a document
 * @param data The document data
 * @returns The normalized document data
 */
export function normalizeUserIdFields(data: DocumentData): DocumentData {
  const normalized = { ...data };
  
  // Standardize on userId (camelCase)
  if (data.userID && !data.userId) {
    normalized.userId = data.userID;
  } else if (data.userid && !data.userId) {
    normalized.userId = data.userid;
  } else if (data.user_id && !data.userId) {
    normalized.userId = data.user_id;
  }
  
  // Standardize on authorId (camelCase)
  if (data.authorID && !data.authorId) {
    normalized.authorId = data.authorID;
  } else if (data.authorid && !data.authorId) {
    normalized.authorId = data.authorid;
  } else if (data.author_id && !data.authorId) {
    normalized.authorId = data.author_id;
  }
  
  // Ensure answerUserIds exists if there are answers
  if (data.answers && Array.isArray(data.answers) && data.answers.length > 0) {
    if (!data.answerUserIds) {
      normalized.answerUserIds = data.answers
        .filter(answer => answer && answer.userId)
        .map(answer => answer.userId);
    }
  }
  
  return normalized;
}

/**
 * Processes a batch of documents to normalize user ID fields
 * @param collectionName The name of the collection to process
 * @param batchSize The number of documents to process in each batch
 * @param dryRun If true, only logs changes without applying them
 * @returns A summary of the changes made
 */
export async function normalizeUserIdFieldsInCollection(
  collectionName: string,
  batchSize: number = 100,
  dryRun: boolean = true
): Promise<{ processed: number, updated: number, errors: number }> {
  const result = { processed: 0, updated: 0, errors: 0 };
  const collectionRef = collection(db, collectionName);
  
  try {
    // Get a batch of documents
    const q = query(collectionRef, limit(batchSize));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No documents found in ${collectionName}`);
      return result;
    }
    
    // Process each document
    const batch = writeBatch(db);
    let changesMade = false;
    
    querySnapshot.forEach(docSnapshot => {
      result.processed++;
      const originalData = docSnapshot.data();
      const normalizedData = normalizeUserIdFields(originalData);
      
      // Check if any changes were made
      const hasChanges = JSON.stringify(originalData) !== JSON.stringify(normalizedData);
      
      if (hasChanges) {
        if (!dryRun) {
          batch.update(doc(db, collectionName, docSnapshot.id), normalizedData);
        }
        result.updated++;
        changesMade = true;
        console.log(`[${dryRun ? 'DRY RUN' : 'UPDATE'}] Document ${docSnapshot.id} would be updated`);
      }
    });
    
    // Commit the batch if changes were made and not in dry run mode
    if (changesMade && !dryRun) {
      await batch.commit();
      console.log(`Batch update committed for ${result.updated} documents`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error normalizing ${collectionName}:`, error);
    result.errors++;
    return result;
  }
}

/**
 * Audits a collection to identify inconsistent field naming
 * @param collectionName The name of the collection to audit
 * @param batchSize The number of documents to process in each batch
 * @returns A summary of the field naming patterns found
 */
export async function auditUserIdFields(
  collectionName: string,
  batchSize: number = 100
): Promise<{ [key: string]: number }> {
  const fieldCounts: { [key: string]: number } = {
    userId: 0,
    userID: 0,
    userid: 0,
    user_id: 0,
    authorId: 0,
    authorID: 0,
    authorid: 0,
    author_id: 0,
    answerUserIds: 0,
    hasAnswers: 0,
    total: 0
  };
  
  const collectionRef = collection(db, collectionName);
  
  try {
    // Get a batch of documents
    const q = query(collectionRef, limit(batchSize));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No documents found in ${collectionName}`);
      return fieldCounts;
    }
    
    // Count field patterns
    querySnapshot.forEach(docSnapshot => {
      fieldCounts.total++;
      const data = docSnapshot.data();
      
      if (data.userId) fieldCounts.userId++;
      if (data.userID) fieldCounts.userID++;
      if (data.userid) fieldCounts.userid++;
      if (data.user_id) fieldCounts.user_id++;
      
      if (data.authorId) fieldCounts.authorId++;
      if (data.authorID) fieldCounts.authorID++;
      if (data.authorid) fieldCounts.authorid++;
      if (data.author_id) fieldCounts.author_id++;
      
      if (data.answerUserIds) fieldCounts.answerUserIds++;
      if (data.answers && Array.isArray(data.answers) && data.answers.length > 0) {
        fieldCounts.hasAnswers++;
      }
    });
    
    return fieldCounts;
  } catch (error) {
    console.error(`Error auditing ${collectionName}:`, error);
    return fieldCounts;
  }
} 