import { UserService } from '@/services/userService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userID = params.id;
    
    // First try the standardized version
    let userProfile = await UserService.getUserByFirebaseUid(userID);
    
    // If not found, try by username
    if (!userProfile) {
      userProfile = await UserService.getUserByUsername(userID);
    }
    
    // If still not found, return 404
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ userProfile });
  } catch (error) {
    console.error('Error in user profile API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
} 