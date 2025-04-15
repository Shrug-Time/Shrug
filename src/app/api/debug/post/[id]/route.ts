import { NextRequest, NextResponse } from 'next/server';
// import { PostService } from '@/services/firebase';

/*
// Use the exact type definition from Next.js documentation
type RouteParams = {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const postId = params.id;
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Checking structure of post: ${postId}`);
    
    const result = await PostService.checkPostStructure(postId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in post structure API:', error);
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