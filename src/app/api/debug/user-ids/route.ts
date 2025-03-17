import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase';
import { collection, getDocs, limit } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const userIds = snapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email ? `${doc.data().email.substring(0, 3)}***${doc.data().email.substring(doc.data().email.indexOf('@'))}` : null,
      name: doc.data().name || 'Unknown',
      handle: doc.data().handle || null
    }));
    
    return NextResponse.json({
      success: true,
      users: userIds
    });
  } catch (error) {
    console.error('Error fetching user IDs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
} 