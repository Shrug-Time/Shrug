import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { email, uid } = await request.json();
    
    if (!email && !uid) {
      return NextResponse.json({ error: 'Email or UID is required' }, { status: 400 });
    }

    let userRecord;
    
    // Get user by email or UID
    if (email) {
      userRecord = await auth.getUserByEmail(email);
    } else {
      userRecord = await auth.getUser(uid);
    }

    // Update user to mark email as verified
    await auth.updateUser(userRecord.uid, {
      emailVerified: true
    });

    return NextResponse.json({ 
      success: true, 
      message: `Email verification bypassed for user: ${userRecord.email}`,
      uid: userRecord.uid 
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json({ 
      error: 'Failed to verify user', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}