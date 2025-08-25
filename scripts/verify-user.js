/**
 * Quick script to manually verify a user's email
 * Usage: node scripts/verify-user.js <email_or_uid>
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function verifyUser(emailOrUid) {
  try {
    console.log(`Looking up user: ${emailOrUid}`);
    
    // Try to get user by email first, then by UID
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(emailOrUid);
    } catch (error) {
      // If not found by email, try by UID
      userRecord = await admin.auth().getUser(emailOrUid);
    }
    
    console.log(`Found user: ${userRecord.email} (UID: ${userRecord.uid})`);
    console.log(`Current email verified status: ${userRecord.emailVerified}`);
    
    if (userRecord.emailVerified) {
      console.log('✅ User email is already verified!');
      return;
    }
    
    // Update user to mark email as verified
    await admin.auth().updateUser(userRecord.uid, {
      emailVerified: true
    });
    
    console.log('✅ Successfully verified user email!');
    console.log(`User ${userRecord.email} can now access the platform with full permissions.`);
    
  } catch (error) {
    console.error('❌ Error verifying user:', error.message);
    process.exit(1);
  }
}

// Get email/UID from command line argument
const emailOrUid = process.argv[2];
if (!emailOrUid) {
  console.error('Please provide an email or UID as an argument');
  console.error('Usage: node scripts/verify-user.js <email_or_uid>');
  process.exit(1);
}

verifyUser(emailOrUid).then(() => {
  console.log('Script completed successfully');
  process.exit(0);
});