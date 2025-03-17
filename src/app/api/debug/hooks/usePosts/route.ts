import { NextRequest, NextResponse } from 'next/server';
import { PostService } from '@/services/firebase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const totemName = searchParams.get('totemName');
    
    if (!userId && !totemName) {
      return NextResponse.json(
        { error: 'Either userId or totemName must be provided' },
        { status: 400 }
      );
    }
    
    let result;
    
    if (userId) {
      console.log(`[API] Testing usePosts hook with userId: ${userId}`);
      try {
        const posts = await PostService.getUserPosts(userId);
        result = {
          success: true,
          count: posts.length,
          posts: posts.map(post => ({
            id: post.id,
            question: post.question,
            answersCount: post.answers?.length || 0
          }))
        };
      } catch (error) {
        console.error('[API] Error fetching posts for user:', error);
        result = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null
        };
      }
    } else if (totemName) {
      console.log(`[API] Testing usePosts hook with totemName: ${totemName}`);
      try {
        // For simplicity, we're not implementing pagination here
        const { posts } = await PostService.getPaginatedPosts(null, []);
        const filteredPosts = posts.filter(post => 
          post.categories?.includes(totemName) || 
          post.answers?.some(answer => answer.totems?.some(totem => totem.name === totemName))
        );
        
        result = {
          success: true,
          count: filteredPosts.length,
          posts: filteredPosts.map(post => ({
            id: post.id,
            question: post.question,
            answersCount: post.answers?.length || 0
          }))
        };
      } catch (error) {
        console.error('[API] Error fetching posts for totem:', error);
        result = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null
        };
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in debug API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 