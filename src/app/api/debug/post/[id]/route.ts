import { NextRequest, NextResponse } from 'next/server';
import { PostService } from '@/services/firebase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params.id is properly awaited
    const { id } = await params;
    const postId = id;
    
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