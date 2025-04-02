import { migrateUserIds } from './migrateUserIds';

/**
 * This script runs the user ID migration.
 * 
 * To run this script:
 * 1. Make sure you have the necessary Firebase permissions
 * 2. Run: npx ts-node -r tsconfig-paths/register src/scripts/runMigration.ts
 */
async function main() {
  console.log('Starting user ID migration process...');
  
  try {
    await migrateUserIds();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
main(); 