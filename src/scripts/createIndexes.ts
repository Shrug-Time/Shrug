/**
 * This script generates the commands to create the necessary Firestore indexes
 * for the standardized user ID fields.
 * 
 * Note: This script doesn't create the indexes directly, but generates the
 * Firebase CLI commands that you can run to create them.
 */

const indexes = [
  // Posts by firebaseUid
  {
    collection: 'posts',
    fields: [
      { fieldPath: 'firebaseUid', order: 'ASCENDING' },
      { fieldPath: 'lastEngagement', order: 'DESCENDING' }
    ]
  },
  // Posts by username
  {
    collection: 'posts',
    fields: [
      { fieldPath: 'username', order: 'ASCENDING' },
      { fieldPath: 'lastEngagement', order: 'DESCENDING' }
    ]
  },
  // Posts with answers by firebaseUid
  {
    collection: 'posts',
    fields: [
      { fieldPath: 'answerFirebaseUids', arrayConfig: 'CONTAINS' },
      { fieldPath: 'lastEngagement', order: 'DESCENDING' }
    ]
  },
  // Posts with answers by username
  {
    collection: 'posts',
    fields: [
      { fieldPath: 'answerUsernames', arrayConfig: 'CONTAINS' },
      { fieldPath: 'lastEngagement', order: 'DESCENDING' }
    ]
  },
  // Legacy indexes for backward compatibility
  {
    collection: 'posts',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'lastEngagement', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'posts',
    fields: [
      { fieldPath: 'answerUserIds', arrayConfig: 'CONTAINS' },
      { fieldPath: 'lastEngagement', order: 'DESCENDING' }
    ]
  }
];

// Generate Firebase CLI commands
console.log('Run the following commands to create the necessary indexes:');
console.log('');

indexes.forEach((index, i) => {
  const fields = index.fields.map(field => {
    if (field.arrayConfig) {
      return `{ "fieldPath": "${field.fieldPath}", "arrayConfig": "${field.arrayConfig}" }`;
    }
    return `{ "fieldPath": "${field.fieldPath}", "order": "${field.order}" }`;
  }).join(', ');
  
  console.log(`firebase firestore:indexes --project=YOUR_PROJECT_ID --add '{ "collectionGroup": "${index.collection}", "queryScope": "COLLECTION", "fields": [${fields}] }'`);
});

console.log('');
console.log('Or add the following to your firestore.indexes.json file:');
console.log('');
console.log(JSON.stringify({ indexes }, null, 2)); 