import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

async function verifyAdmin(request: NextRequest): Promise<string | NextResponse> {
  const authHeader = request.headers.get('authorization');
  const idToken = authHeader?.replace('Bearer ', '');

  if (!idToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists || userDoc.data()?.membershipTier !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin(request);
  if (adminResult instanceof NextResponse) return adminResult;

  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'deletePost': {
        const { postId } = data;
        if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();
        if (!postDoc.exists) {
          return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        await postRef.delete();
        return NextResponse.json({ message: 'Post deleted' });
      }

      case 'deleteAnswer': {
        const { postId, answerId } = data;
        if (!postId || !answerId) return NextResponse.json({ error: 'postId and answerId required' }, { status: 400 });

        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();
        if (!postDoc.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

        const postData = postDoc.data()!;
        const updatedAnswers = (postData.answers || []).filter((a: any) => a.id !== answerId);

        await postRef.update({
          answers: updatedAnswers,
          updatedAt: Date.now(),
          answerCount: updatedAnswers.length
        });
        return NextResponse.json({ message: 'Answer deleted' });
      }

      case 'deleteUser': {
        const { userId } = data;
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

        // Delete Firebase Auth account
        try {
          await admin.auth().deleteUser(userId);
        } catch (e: any) {
          if (e.code !== 'auth/user-not-found') throw e;
        }

        // Delete Firestore profile
        await db.collection('users').doc(userId).delete();

        return NextResponse.json({ message: 'User deleted' });
      }

      case 'deleteProfilePhoto': {
        const { userId } = data;
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const userData = userDoc.data()!;
        if (userData.photoURL) {
          // Try to delete from storage
          try {
            const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
            const path = decodeURIComponent(userData.photoURL.split('/o/')[1]?.split('?')[0] || '');
            if (path) await bucket.file(path).delete();
          } catch (e) {
            console.warn('Could not delete photo from storage:', e);
          }
        }

        await userRef.update({ photoURL: admin.firestore.FieldValue.delete(), updatedAt: Date.now() });
        return NextResponse.json({ message: 'Profile photo deleted' });
      }

      case 'updateUser': {
        const { userId, updates } = data;
        if (!userId || !updates) return NextResponse.json({ error: 'userId and updates required' }, { status: 400 });

        // Only allow safe fields to be updated
        const allowedFields = ['name', 'bio', 'username', 'membershipTier', 'verificationStatus'];
        const safeUpdates: Record<string, any> = {};
        for (const key of Object.keys(updates)) {
          if (allowedFields.includes(key)) safeUpdates[key] = updates[key];
        }
        safeUpdates.updatedAt = Date.now();

        await db.collection('users').doc(userId).update(safeUpdates);
        return NextResponse.json({ message: 'User updated' });
      }

      case 'listUsers': {
        const { limit: limitCount = 50 } = data;
        const snapshot = await db.collection('users').limit(limitCount).get();
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
          username: doc.data().username,
          membershipTier: doc.data().membershipTier,
          photoURL: doc.data().photoURL,
          createdAt: doc.data().createdAt,
        }));
        return NextResponse.json({ users });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
