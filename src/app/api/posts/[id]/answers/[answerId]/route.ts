import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Post } from '@/types/models';

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
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Check if user is admin
    const userDoc = await db.collection('users').doc(userId).get();
    const isAdmin = userDoc.exists && userDoc.data()?.membershipTier === 'admin';

    // Get the post
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
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

    // Check if the user owns this answer OR is admin
    if (answerToDelete.firebaseUid !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to delete this answer' },
        { status: 403 }
      );
    }

    // Remove the answer from the post's answers array
    const updatedAnswers = postData.answers.filter(answer => answer.id !== answerId);

    // Update the post with the filtered answers array
    await postRef.update({
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