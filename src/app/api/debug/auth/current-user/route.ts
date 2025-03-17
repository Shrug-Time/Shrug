import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export async function GET(request: NextRequest) {
  try {
    // Get the current user from the auth state using the imported auth instance
    const currentUser = await new Promise<User | null>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      }, reject);
    });
    
    if (!currentUser) {
      return NextResponse.json({
        authenticated: false,
        message: 'No user is currently authenticated'
      });
    }
    
    // Return safe user information
    return NextResponse.json({
      authenticated: true,
      user: {
        uid: currentUser.uid,
        email: currentUser.email ? `${currentUser.email.substring(0, 3)}***${currentUser.email.substring(currentUser.email.indexOf('@'))}` : null,
        displayName: currentUser.displayName,
        emailVerified: currentUser.emailVerified,
        isAnonymous: currentUser.isAnonymous,
        createdAt: currentUser.metadata.creationTime,
        lastSignInTime: currentUser.metadata.lastSignInTime
      }
    });
  } catch (error) {
    console.error('Error in auth debug API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 