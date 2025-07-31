import { NextRequest, NextResponse } from 'next/server';
import { StripeSubscriptionService } from '@/services/stripeSubscriptionService';

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment Intent ID is required' }, { status: 400 });
    }

    // Create subscription from the successful payment
    const success = await StripeSubscriptionService.createSubscriptionFromPayment(paymentIntentId);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating subscription from payment:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 