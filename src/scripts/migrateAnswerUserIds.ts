import { db } from '@/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Post } from '@/types/models';
import { normalizePost } from '@/utils/dataTransform';

/**
 * Migration script to add answerUserIds field to all posts
 * This helps with more efficient querying of posts by user ID
 */
export async function migrateAnswerUserIds() {
  try {
    console.log('Starting migration: Adding answerUserIds field to posts');
    
    // Get all posts
    const postsRef = collection(db, 'posts');
    const snapshot = await getDocs(postsRef);
    
    console.log(`Found ${snapshot.docs.length} posts to process`);
    
    // Process in batches for better performance
    const BATCH_SIZE = 500;
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process posts in batches
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batchDocs.length} posts)`);
      
      for (const postDoc of batchDocs) {
        try {
          // Normalize the post data
          const post = normalizePost(postDoc.id, postDoc.data());
          
          // Extract unique user IDs from answers
          const answerUserIds = [...new Set(
            post.answers
              .map(answer => answer.userId)
              .filter(Boolean)
          )];
          
          // Only update if there are answer user IDs
          if (answerUserIds.length > 0) {
            batch.update(doc(db, 'posts', post.id), { answerUserIds });
            updatedCount++;
          }
          
          processedCount++;
        } catch (error) {
          console.error(`Error processing post ${postDoc.id}:`, error);
          errorCount++;
        }
      }
      
      // Commit the batch
      try {
        await batch.commit();
        console.log(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1}`);
      } catch (error) {
        console.error(`Error committing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        errorCount += batchDocs.length;
      }
    }
    
    console.log('Migration complete:');
    console.log(`- Processed: ${processedCount} posts`);
    console.log(`- Updated: ${updatedCount} posts`);
    console.log(`- Errors: ${errorCount} posts`);
    
    return {
      processed: processedCount,
      updated: updatedCount,
      errors: errorCount
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateAnswerUserIds()
    .then(result => {
      console.log('Migration completed successfully:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 