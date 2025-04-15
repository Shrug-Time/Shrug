/**
 * THIS MIGRATION SCRIPT IS NO LONGER NEEDED
 * 
 * Since the database has been cleared, there's no legacy data to migrate.
 * Keeping this file for reference only.
 */

/*
import dotenv from 'dotenv';
import path from 'path';
// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { normalizePost } from '../utils/normalizers';

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

async function migrateAnswerUserIds() {
  try {
    console.log('Starting migration of answer user IDs...');
    
    // Get all posts
    const postsSnapshot = await db.collection('posts').get();
    console.log(`Found ${postsSnapshot.size} posts to process`);
    
    let updatedPostsCount = 0;
    let totalAnswersProcessed = 0;
    
    // Process each post
    for (const postDoc of postsSnapshot.docs) {
      try {
        // Convert Firestore document to normalized post
        const post = normalizePost(postDoc.id, postDoc.data());
        
        // Get unique user IDs from answers using type assertion for legacy data
        const answerUserIds = [...new Set(
          post.answers
            .map(answer => {
              const answerAny = answer as any;
              return answerAny.userId || answerAny.authorId || '';
            })
            .filter(Boolean)
        )];
        
        // Skip if no user IDs found
        if (answerUserIds.length === 0) {
          console.log(`Skipping post ${postDoc.id} - no user IDs found in answers`);
          continue;
        }
        
        console.log(`Processing post ${postDoc.id} with ${post.answers.length} answers and ${answerUserIds.length} unique user IDs`);
        
        // Update the post document with the user IDs for faster queries
        await postDoc.ref.update({
          answerUserIds: answerUserIds
        });
        
        updatedPostsCount++;
        totalAnswersProcessed += post.answers.length;
        
      } catch (error) {
        console.error(`Error processing post ${postDoc.id}:`, error);
      }
    }
    
    console.log(`Migration complete. Updated ${updatedPostsCount} posts with ${totalAnswersProcessed} answers total.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateAnswerUserIds().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
*/ 