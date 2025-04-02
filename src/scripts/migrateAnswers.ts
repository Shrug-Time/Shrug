import { PostService } from '../services/firebase';

async function main() {
  try {
    await PostService.migrateAnswersToUserAnswers();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main(); 