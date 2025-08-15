import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Answer } from '@/types/models';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; answerId: string } }
) {
  try {
    const { id: postId, answerId } = params;

    if (!postId || !answerId) {
      return NextResponse.json(
        { error: 'Post ID and Answer ID are required' },
        { status: 400 }
      );
    }

    // Get the Authorization header
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.replace('Bearer ', '');

    if (!idToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the Firebase ID token
    let decodedToken;
    try {
      const { auth: adminAuth } = await import('firebase-admin/auth');
      const admin = await import('firebase-admin');
      
      if (!admin.getApps().length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }

      decodedToken = await adminAuth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Get the post to find and verify the answer
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const postData = postDoc.data() as Post;

    // Find the answer to delete
    const answerToDelete = postData.answers?.find(answer => answer.id === answerId);

    if (!answerToDelete) {
      return NextResponse.json(
        { error: 'Answer not found' },
        { status: 404 }
      );
    }

    // Check if the user owns this answer
    if (answerToDelete.firebaseUid !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this answer' },
        { status: 403 }
      );
    }

    // Remove the answer from the post's answers array
    const updatedAnswers = postData.answers.filter(answer => answer.id !== answerId);

    // Update the post with the filtered answers array
    await updateDoc(postRef, {
      answers: updatedAnswers,
      updatedAt: Date.now(),
      answerCount: updatedAnswers.length
    });

    return NextResponse.json(
      { message: 'Answer deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting answer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}