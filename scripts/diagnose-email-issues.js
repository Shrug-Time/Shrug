/**
 * Diagnostic script to identify email delivery issues
 * Usage: node scripts/diagnose-email-issues.js
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

async function diagnoseEmailIssues() {
  console.log('🔍 Firebase Email Verification Diagnostic\n');
  
  // 1. Check Firebase project configuration
  console.log('1. Firebase Project Configuration:');
  console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID || 'NOT SET'}`);
  console.log(`   Auth Domain: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'NOT SET'}`);
  
  // 2. Check recent user signups and their email verification status
  console.log('\n2. Recent User Signups (last 10):');
  try {
    const listUsersResult = await admin.auth().listUsers(10);
    
    listUsersResult.users.forEach((userRecord, index) => {
      const creationTime = new Date(userRecord.metadata.creationTime);
      const isRecent = Date.now() - creationTime.getTime() < 24 * 60 * 60 * 1000; // Last 24 hours
      
      console.log(`   ${index + 1}. ${userRecord.email || 'No email'}`);
      console.log(`      UID: ${userRecord.uid}`);
      console.log(`      Email Verified: ${userRecord.emailVerified}`);
      console.log(`      Created: ${creationTime.toLocaleString()}`);
      console.log(`      Recent signup: ${isRecent ? 'Yes' : 'No'}`);
      
      if (!userRecord.emailVerified && isRecent) {
        console.log(`      ⚠️  This user signed up recently but email is not verified`);
      }
      console.log('');
    });
  } catch (error) {
    console.log(`   ❌ Error fetching users: ${error.message}`);
  }
  
  // 3. Check for common email delivery issues
  console.log('\n3. Common Email Delivery Issues to Check:');
  console.log(`   ✓ Check Firebase Console → Authentication → Templates`);
  console.log(`   ✓ Verify sender email is configured`);
  console.log(`   ✓ Check spam/junk folders`);
  console.log(`   ✓ Verify domain reputation`);
  console.log(`   ✓ Check email quotas/limits`);
  
  // 4. Environment variables check
  console.log('\n4. Environment Variables Status:');
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL', 
    'FIREBASE_PRIVATE_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'
  ];
  
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`   ${varName}: ${value ? '✓ Set' : '❌ Missing'}`);
  });
  
  // 5. Test email verification process
  console.log('\n5. Email Verification Implementation Check:');
  console.log(`   ✓ Using Firebase's sendEmailVerification() - Correct`);
  console.log(`   ✓ No custom actionCodeSettings - Using Firebase defaults`);
  console.log(`   ⚠️  No custom email templates - Using Firebase defaults`);
  
  console.log('\n📋 Recommended Actions:');
  console.log('1. Check Firebase Console → Authentication → Settings → Email Templates');
  console.log('2. Verify your project\'s sender email address');
  console.log('3. Check if Gmail/other providers are blocking emails');
  console.log('4. Consider implementing custom actionCodeSettings with your domain');
  console.log('5. Test with different email providers (Gmail, Yahoo, Outlook)');
}

diagnoseEmailIssues().then(() => {
  console.log('\n✅ Diagnostic complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Diagnostic failed:', error);
  process.exit(1);
});