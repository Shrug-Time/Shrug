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
 * POST /api/admin/verify-email-bypass
 *
 * DEV ONLY: Manually marks a user's email as verified
 * Bypasses Firebase email verification for testing
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

    // Get user from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    const userId = userRecord.uid;

    // Update Firebase Auth to mark email as verified
    await auth.updateUser(userId, {
      emailVerified: true
    });
    console.log(`✅ Marked email as verified in Firebase Auth: ${email}`);

    // Update Firestore profile
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      await userRef.update({
        verificationStatus: 'email_verified',
        updatedAt: Date.now()
      });
      console.log(`✅ Updated verification status in Firestore: ${userId}`);
    }

    return NextResponse.json({
      success: true,
      email,
      userId,
      message: 'Email verification bypassed successfully for development'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Verify email bypass error:', error);
    return NextResponse.json(
      {
        error: 'Failed to bypass email verification',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
