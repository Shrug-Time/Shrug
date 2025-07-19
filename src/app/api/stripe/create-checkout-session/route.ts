import { NextRequest, NextResponse } from 'next/server';
import { StripeSubscriptionService } from '@/services/stripeSubscriptionService';
import { auth } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Create checkout session
    const { sessionId, url } = await StripeSubscriptionService.createCheckoutSession(userId);

    return NextResponse.json({
      sessionId,
      url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 