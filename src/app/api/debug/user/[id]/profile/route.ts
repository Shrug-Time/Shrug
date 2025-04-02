import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/firebase';
import { UserService as AppUserService } from '@/services/userService';

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
    
    console.log(`[API] Fetching profile for user: ${userId}`);
    
    // Try to get user by Firebase UID first
    let profile = await AppUserService.getUserByFirebaseUid(userId);
    
    // If not found, try by username
    if (!profile) {
      profile = await AppUserService.getUserByUsername(userId);
    }
    
    // Fall back to legacy service if needed
    if (!profile) {
      profile = await UserService.getUserProfile(userId);
    }
    
    if (!profile) {
      return NextResponse.json(
        { exists: false, message: `No profile found for user ID: ${userId}` },
        { status: 404 }
      );
    }
    
    // Mask sensitive information
    const maskedProfile = { ...profile };
    if (maskedProfile.email) {
      maskedProfile.email = `${maskedProfile.email.substring(0, 3)}***${maskedProfile.email.substring(maskedProfile.email.indexOf('@'))}`;
    }
    
    return NextResponse.json({
      exists: true,
      profile: maskedProfile
    });
  } catch (error) {
    console.error('Error in user profile API:', error);
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