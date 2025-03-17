# Database Migration Scripts

This directory contains scripts for migrating data in the database.

## User ID Standardization Migration

The `migrateUserIds.ts` script standardizes user identification across the application by:

1. Updating all user profiles to use the new field names (`firebaseUid` and `username`)
2. Updating all posts to use the new field names
3. Ensuring consistency between collections

### Running the Migration

To run the migration:

```bash
# Install ts-node if you haven't already
npm install -g ts-node tsconfig-paths

# Run the migration script
npx ts-node -r tsconfig-paths/register src/scripts/runMigration.ts
```

### Prerequisites

- You must have admin access to the Firebase project
- Make sure you have the necessary Firebase permissions
- Back up your database before running the migration

### Verification

After running the migration, you can verify that it worked by:

1. Checking the user profiles in the Firebase console
2. Checking the posts in the Firebase console
3. Testing the application to ensure it works with the new field names

### Rollback

If you need to roll back the migration, you can restore the database from your backup.

## Other Scripts

- `runMigration.ts`: A helper script to run the migration with proper error handling 