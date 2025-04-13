import * as admin from 'firebase-admin';

// Debug helper function to print environment variables without exposing them completely
function logEnvVarStatus() {
  console.log('Firebase Admin Environment Variables Check:');
  console.log(`- FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? 'Present' : 'Missing'}`);
  console.log(`- FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? 'Present' : 'Missing'}`);
  
  // For private key, we'll check if it starts with the expected pattern and show more details if not
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    console.log('- FIREBASE_PRIVATE_KEY: Missing');
  } else if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.log(`- FIREBASE_PRIVATE_KEY: Present but might be malformed (doesn't start with expected pattern)`);
    console.log(`  First 20 chars: "${privateKey.substring(0, 20)}..."`);
  } else {
    console.log('- FIREBASE_PRIVATE_KEY: Present and has correct format');
  }
}

// Initialize Firebase Admin SDK only on the server
// This prevents it from being included in client-side bundles
function initializeFirebaseAdmin(): admin.app.App {
  try {
    // Check if Firebase Admin SDK is already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase Admin SDK already initialized');
      return admin.apps[0]!;
    }

    console.log('Starting Firebase Admin SDK initialization...');
    logEnvVarStatus();

    // Check if required environment variables are available
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Firebase Admin SDK environment variables are missing. Check your .env.local file.');
      
      // Create a safer way to handle missing credentials in development
      // This prevents crashing but will limit functionality
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock Firebase Admin in development due to missing credentials');
        // Return initialized instance but with limited functionality
        try {
          const app = admin.initializeApp({
            projectId: 'mock-project',
            credential: admin.credential.cert({
              projectId: 'mock-project',
              clientEmail: 'mock@example.com',
              privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n',
            } as admin.ServiceAccount),
          }, 'mock');
          return app;
        } catch (mockError: any) {
          console.error('Even mock initialization failed:', mockError);
          throw mockError;
        }
      }
      
      throw new Error('Firebase Admin SDK environment variables are missing');
    }

    try {
      // Process the private key - ensure it has correct newlines
      let processedPrivateKey = privateKey;
      if (privateKey.includes('\\n')) {
        console.log('Private key contains escaped newlines, replacing them');
        processedPrivateKey = privateKey.replace(/\\n/g, '\n');
      }

      // Initialize with better error handling
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: processedPrivateKey,
        } as admin.ServiceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully');
      return app;
    } catch (initError: any) {
      console.error('Error during Firebase Admin initialization:', initError);
      
      // Additional debugging for private key issues
      if (initError.message && initError.message.includes('private key')) {
        console.error('Private key appears to be malformed. Make sure it is properly formatted with newlines.');
        console.error('First 30 chars of private key:', privateKey.substring(0, 30) + '...');
      }
      
      throw initError;
    }
  } catch (error) {
    console.error('Top-level error in Firebase Admin initialization:', error);
    throw error;
  }
}

// Initialize the admin SDK with try/catch
let firebaseApp: admin.app.App | null = null;
try {
  firebaseApp = initializeFirebaseAdmin();
  console.log('Firebase Admin initialization complete');
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  // In development, we'll create a mock for easier debugging
  if (process.env.NODE_ENV === 'development') {
    console.warn('Creating emergency mock Firebase Admin for development');
    try {
      admin.initializeApp({
        projectId: 'emergency-mock',
      });
      firebaseApp = admin.apps[0];
    } catch (e) {
      console.error('Failed to create emergency mock:', e);
    }
  }
}

// Export the admin instance with its type
export const firebaseAdmin: typeof admin = admin;

// Wrap service initialization in try/catch blocks
let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;

try {
  if (firebaseApp) {
    adminAuth = admin.auth();
    console.log('Firebase Admin Auth initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin Auth:', error);
  adminAuth = null;
}

try {
  if (firebaseApp) {
    adminDb = admin.firestore();
    console.log('Firebase Admin Firestore initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin Firestore:', error);
  adminDb = null;
}

export { adminAuth, adminDb }; 