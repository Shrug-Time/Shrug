import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

/**
 * DELETE /api/admin/delete-user
 *
 * Deletes a user from Firebase Auth and Firestore
 * Requires RESET_DB_SECRET for security
 *
 * Body: { email: string, secret: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, secret } = body;

    // Validate secret
    if (!secret || secret !== process.env.RESET_DB_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid secret' },
        { status: 401 }
      );
    }

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    let deletedFromAuth = false;
    let deletedFromFirestore = false;
    let userId: string | null = null;

    // Try to get user from Firebase Auth
    try {
      const userRecord = await auth.getUserByEmail(email);
      userId = userRecord.uid;

      // Delete from Firebase Auth
      await auth.deleteUser(userId);
      deletedFromAuth = true;
      console.log(`✅ Deleted user from Firebase Auth: ${email} (${userId})`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️ User not found in Firebase Auth: ${email}`);
      } else {
        console.error('Error deleting from Firebase Auth:', error);
        throw error;
      }
    }

    // Try to delete from Firestore
    if (userId) {
      try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          await userRef.delete();
          deletedFromFirestore = true;
          console.log(`✅ Deleted user from Firestore: ${userId}`);
        } else {
          console.log(`⚠️ User document not found in Firestore: ${userId}`);
        }
      } catch (error) {
        console.error('Error deleting from Firestore:', error);
        throw error;
      }
    }

    // Build response message
    const results = {
      email,
      userId,
      deletedFromAuth,
      deletedFromFirestore,
      message: !deletedFromAuth && !deletedFromFirestore
        ? 'User not found in Firebase Auth or Firestore'
        : 'User deleted successfully'
    };

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
