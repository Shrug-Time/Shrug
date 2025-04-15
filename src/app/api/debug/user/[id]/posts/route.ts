import { NextRequest, NextResponse } from 'next/server';
// import { PostService } from '@/services/firebase';
// import { UserService } from '@/services/userService';

/*
// Define a more flexible type for handling both old and new field names during transition
interface FlexiblePost {
  id: string;
  firebaseUid?: string;
  userId?: string;
  username?: string;
  userName?: string;
  answerFirebaseUids?: string[];
  answerUserIds?: string[];
  answers?: Array<{
    firebaseUid?: string;
    userId?: string;
    username?: string;
    userName?: string;
    // other answer fields
  }>;
  // other post fields
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params.id is properly awaited
    const { id } = await params;
    const userId = id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Fetching posts for user: ${userId}`);
    
    // Determine if the ID is a Firebase UID or username
    let firebaseUid = userId;
    let username = userId;
    
    // Try to get user by Firebase UID first
    let userProfile = await UserService.getUserByFirebaseUid(userId);
    
    // If not found, try by username
    if (!userProfile) {
      userProfile = await UserService.getUserByUsername(userId);
      if (userProfile) {
        firebaseUid = userProfile.firebaseUid;
      }
    } else {
      username = userProfile.username;
    }
    
    // Get posts using the Firebase UID
    const posts = await PostService.getUserPosts(firebaseUid) as FlexiblePost[];
    
    return NextResponse.json({
      createdPosts: posts.filter(post => 
        post.firebaseUid === firebaseUid || 
        post.userId === firebaseUid || 
        post.username === username ||
        post.userName === username
      ),
      createdPostsCount: posts.filter(post => 
        post.firebaseUid === firebaseUid || 
        post.userId === firebaseUid || 
        post.username === username ||
        post.userName === username
      ).length,
      answeredPosts: posts.filter(post => 
        post.answerFirebaseUids?.includes(firebaseUid) || 
        post.answerUserIds?.includes(firebaseUid) ||
        post.answers?.some(a => 
          a.firebaseUid === firebaseUid || 
          a.userId === firebaseUid || 
          a.username === username ||
          a.userName === username
        )
      ),
      answeredPostsCount: posts.filter(post => 
        post.answerFirebaseUids?.includes(firebaseUid) || 
        post.answerUserIds?.includes(firebaseUid) ||
        post.answers?.some(a => 
          a.firebaseUid === firebaseUid || 
          a.userId === firebaseUid || 
          a.username === username ||
          a.userName === username
        )
      ).length
    });
  } catch (error) {
    console.error('Error in user posts API:', error);
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
*/

// Temporary placeholder API during refactoring
export async function GET(
  request: NextRequest
) {
  return NextResponse.json({ message: "API temporarily disabled during refactoring" }, { status: 503 });
} 