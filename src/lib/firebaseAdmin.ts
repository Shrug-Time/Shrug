import * as admin from 'firebase-admin';

/**
 * Validates Firebase Admin SDK environment variables and returns their values
 * @returns Object containing validated environment variables
 */
function getFirebaseAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;



  // Return validated config
  return { projectId, clientEmail, privateKey };
}

/**
 * Initialize Firebase Admin SDK with proper error handling
 * @returns Initialized Firebase Admin app
 */
function initializeFirebaseAdmin(): admin.app.App {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Get and validate configuration
  const { projectId, clientEmail, privateKey } = getFirebaseAdminConfig();
  
  // Check if required environment variables are available
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase Admin SDK environment variables are missing. Check your .env.local file.');
    
    // Create a mock instance for development to prevent complete failure
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock Firebase Admin in development due to missing credentials');
      return admin.initializeApp({
        projectId: 'mock-project',
      });
    }
    
    throw new Error('Firebase Admin SDK environment variables are missing');
  }

  try {
    // Process the private key - replace escaped newlines if present
    const processedPrivateKey = privateKey.includes('\\n') 
      ? privateKey.replace(/\\n/g, '\n') 
      : privateKey;

    // Initialize with credential
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: processedPrivateKey,
      } as admin.ServiceAccount),
    });
  } catch (error) {
    console.error('Error during Firebase Admin initialization:', error);
    throw error;
  }
}

// Initialize the Firebase Admin SDK
let firebaseApp: admin.app.App;
try {
  firebaseApp = initializeFirebaseAdmin();
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  
  // In development, create a mock for debugging
  if (process.env.NODE_ENV === 'development') {
    console.warn('Creating emergency mock Firebase Admin for development');
    admin.initializeApp({
      projectId: 'emergency-mock',
    });
    firebaseApp = admin.apps[0]!;
  } else {
    throw error;
  }
}

// Initialize services with proper error handling
const adminAuth = admin.auth();
const adminFirestore = admin.firestore();



// Export the admin instance and services with proper typing
export const firebaseAdmin = admin;
export const auth = adminAuth;
export const db = adminFirestore;

// For compatibility with existing code
export { adminAuth, adminFirestore as adminDb }; 