import { NextRequest, NextResponse } from 'next/server';
import { migrateAnswerUserIds } from '@/scripts/migrateAnswerUserIds';
import { auth } from '@/firebase';
import { UserService } from '@/services/firebase';

/**
 * API endpoint to run migrations
 * This is protected and only accessible to admin users
 */
export async function POST(request: NextRequest) {
  try {
    // Get the current user from the session
    const user = auth.currentUser;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if the user is an admin
    const userProfile = await UserService.getUserProfile(user.uid);
    
    if (!userProfile || userProfile.membershipTier !== 'premium') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { migration } = body;
    
    if (migration === 'answerUserIds') {
      // Run the migration in the background
      // We don't await this because it might take a long time
      migrateAnswerUserIds()
        .then(result => {
          console.log('Migration completed successfully:', result);
        })
        .catch(error => {
          console.error('Migration failed:', error);
        });
      
      return NextResponse.json({
        success: true,
        message: 'Migration started in the background'
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid migration type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in migration API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 