/**
 * Stripe Subscription Service
 * 
 * Real payment processing integration with Stripe.
 * Replaces mock subscription functionality with actual payment processing.
 */

import Stripe from 'stripe';
import { db } from '@/lib/firebaseAdmin';
import { UserService } from './userService';
import { MembershipTier, UserProfile } from '@/types/models';

// Initialize Stripe only if secret key is available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    })
  : null;

  /**
   * Stripe-based subscription service
   */
  export class StripeSubscriptionService {
    /**
     * Helper to check if Stripe is configured
     */
    private static getStripe(): Stripe {
      if (!stripe) {
        throw new Error('Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.');
      }
      return stripe;
    }

    /**
     * Helper to check if Firebase is configured
     */
    private static getFirestore() {
      if (!db) {
        throw new Error('Firebase not configured.');
      }
      return db;
    }
  // Collection references
  private static readonly USERS_COLLECTION = 'users';
  private static readonly SUBSCRIPTIONS_COLLECTION = 'subscriptions';
  private static readonly STRIPE_CUSTOMERS_COLLECTION = 'stripe_customers';
  
  // Subscription plan configuration
  private static readonly PREMIUM_PLAN = {
    id: 'price_premium_monthly',
    name: 'Premium',
    price: 999, // $9.99 in cents
    currency: 'usd',
    interval: 'month'
  };

  /**
   * Creates a Stripe checkout session for subscription
   */
  static async createCheckoutSession(userId: string): Promise<{ sessionId: string; url: string }> {
    try {
      // Get or create Stripe customer
      const customerId = await this.getOrCreateStripeCustomer(userId);
      
      // Create checkout session
      const session = await this.getStripe().checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: this.PREMIUM_PLAN.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription?canceled=true`,
        metadata: {
          userId: userId,
        },
      });

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Gets or creates a Stripe customer for the user
   */
  private static async getOrCreateStripeCustomer(userId: string): Promise<string> {
    try {
      // Check if customer already exists
      const customerDoc = await this.getFirestore()
        .collection(this.STRIPE_CUSTOMERS_COLLECTION)
        .doc(userId)
        .get();

      if (customerDoc.exists) {
        return customerDoc.data()?.stripeCustomerId;
      }

      // Get user profile for customer creation
      const userProfile = await UserService.getUserByFirebaseUid(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Create Stripe customer
      const customer = await this.getStripe().customers.create({
        email: userProfile.email,
        name: userProfile.name,
        metadata: {
          firebaseUid: userId,
        },
      });

      // Store customer ID in Firestore
      await this.getFirestore()
        .collection(this.STRIPE_CUSTOMERS_COLLECTION)
        .doc(userId)
        .set({
          stripeCustomerId: customer.id,
          firebaseUid: userId,
          createdAt: new Date(),
        });

      return customer.id;
    } catch (error) {
      console.error('Error getting/creating Stripe customer:', error);
      throw new Error('Failed to get or create Stripe customer');
    }
  }

  /**
   * Handles Stripe webhook events
   */
  static async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Handles successful checkout completion
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) {
      console.error('No userId in session metadata');
      return;
    }

    // Update user to premium
    await this.updateMembershipTier(userId, 'premium');
    
    console.log(`User ${userId} upgraded to premium via checkout session ${session.id}`);
  }

  /**
   * Handles subscription updates
   */
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const userId = await this.getUserIdFromCustomerId(customerId);
    
    if (!userId) {
      console.error('No userId found for customer:', customerId);
      return;
    }

    const status = subscription.status;
    
    if (status === 'active') {
      await this.updateMembershipTier(userId, 'premium');
    } else if (status === 'canceled' || status === 'unpaid') {
      await this.updateMembershipTier(userId, 'free');
    }
    
    console.log(`Subscription ${subscription.id} updated for user ${userId}: ${status}`);
  }

  /**
   * Handles subscription deletion
   */
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const userId = await this.getUserIdFromCustomerId(customerId);
    
    if (!userId) {
      console.error('No userId found for customer:', customerId);
      return;
    }

    await this.updateMembershipTier(userId, 'free');
    console.log(`Subscription ${subscription.id} deleted for user ${userId}`);
  }

  /**
   * Handles failed payments
   */
  private static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const userId = await this.getUserIdFromCustomerId(customerId);
    
    if (!userId) {
      console.error('No userId found for customer:', customerId);
      return;
    }

    // Could implement grace period logic here
    console.log(`Payment failed for user ${userId}, invoice ${invoice.id}`);
  }

  /**
   * Gets user ID from Stripe customer ID
   */
  private static async getUserIdFromCustomerId(customerId: string): Promise<string | null> {
    try {
      const snapshot = await this.getFirestore()
        .collection(this.STRIPE_CUSTOMERS_COLLECTION)
        .where('stripeCustomerId', '==', customerId)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      return snapshot.docs[0].data().firebaseUid;
    } catch (error) {
      console.error('Error getting userId from customerId:', error);
      return null;
    }
  }

  /**
   * Checks if a user has premium membership (real Stripe check)
   */
  static async isPremiumMember(firebaseUid: string): Promise<boolean> {
    try {
      const userProfile = await UserService.getUserByFirebaseUid(firebaseUid);
      if (!userProfile) return false;

      // Check local membership tier first
      if (userProfile.membershipTier === 'premium') {
        // Verify with Stripe
        const customerId = await this.getOrCreateStripeCustomer(firebaseUid);
        const subscriptions = await this.getStripe().subscriptions.list({
          customer: customerId,
          status: 'active',
        });

        return subscriptions.data.length > 0;
      }

      return false;
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  /**
   * Updates a user's membership tier (with Stripe integration)
   */
  static async updateMembershipTier(
    firebaseUid: string,
    tier: MembershipTier
  ): Promise<UserProfile | null> {
    try {
      // If upgrading to premium, reset refreshes to higher limit
      const refreshesLimit = tier === 'premium' ? 20 : 5;
      
      // Update the user profile
      await UserService.updateProfile(firebaseUid, {
        membershipTier: tier,
        refreshesRemaining: refreshesLimit,
        refreshResetTime: Date.now()
      });
      
      // Record the subscription change
      await this.recordSubscriptionChange(firebaseUid, tier);
      
      // Return the updated profile
      return await UserService.getUserByFirebaseUid(firebaseUid);
    } catch (error) {
      console.error('Error updating membership tier:', error);
      throw error;
    }
  }

  /**
   * Records a subscription change for tracking and analytics
   */
  private static async recordSubscriptionChange(
    firebaseUid: string,
    tier: MembershipTier
  ): Promise<void> {
    try {
      await this.getFirestore()
        .collection(this.SUBSCRIPTIONS_COLLECTION)
        .add({
        firebaseUid,
        tier,
        previousTier: (await UserService.getUserByFirebaseUid(firebaseUid))?.membershipTier || 'free',
        timestamp: Date.now(),
        source: 'stripe'
      });
    } catch (error) {
      console.error('Error recording subscription change:', error);
      // Non-critical failure, don't throw
    }
  }

  /**
   * Cancels a user's subscription
   */
  static async cancelSubscription(firebaseUid: string): Promise<boolean> {
    try {
      const customerId = await this.getOrCreateStripeCustomer(firebaseUid);
      const subscriptions = await this.getStripe().subscriptions.list({
        customer: customerId,
        status: 'active',
      });

      if (subscriptions.data.length === 0) {
        console.log('No active subscription found for user:', firebaseUid);
        return false;
      }

      // Cancel the subscription
      await this.getStripe().subscriptions.update(subscriptions.data[0].id, {
        cancel_at_period_end: true,
      });

      console.log(`Subscription canceled for user ${firebaseUid}`);
      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  }

  /**
   * Gets subscription details for a user
   */
  static async getSubscriptionDetails(firebaseUid: string): Promise<any> {
    try {
      const customerId = await this.getOrCreateStripeCustomer(firebaseUid);
      const subscriptions = await this.getStripe().subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method'],
      });

      if (subscriptions.data.length === 0) {
        return null;
      }

      return subscriptions.data[0];
    } catch (error) {
      console.error('Error getting subscription details:', error);
      return null;
    }
  }

  /**
   * Creates a customer portal session for subscription management
   */
  static async createPortalSession(firebaseUid: string): Promise<string> {
    try {
      const customerId = await this.getOrCreateStripeCustomer(firebaseUid);
      
      const session = await this.getStripe().billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`,
      });

      return session.url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error('Failed to create portal session');
    }
  }
} 