import * as admin from 'firebase-admin';

function getApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin SDK environment variables are missing (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
  }

  // Normalize private key: handle escaped newlines and surrounding quotes from Vercel
  const processedPrivateKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/^"([\s\S]*)"$/, '$1');

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: processedPrivateKey,
    } as admin.ServiceAccount),
  });
}

// Lazy proxy — no Firebase initialization happens at import/build time.
// The app is only initialized when a method is actually called at request time.
function createLazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_, prop: string | symbol) {
      const instance = getInstance();
      const value = (instance as any)[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    }
  });
}

export const auth = createLazyProxy<admin.auth.Auth>(() => getApp().auth());
export const db = createLazyProxy<FirebaseFirestore.Firestore>(() => getApp().firestore());

export const firebaseAdmin = admin;
export const adminAuth = auth;
export const adminDb = db;
