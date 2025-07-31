/**
 * Stripe Subscription Service
 * 
 * Real payment processing integration with Stripe.
 * Replaces mock subscription functionality with actual payment processing.
 */

import Stripe from 'stripe';
import { db } from '@/lib/firebaseAdmin';
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

    /**
     * Server-side method to get user by Firebase UID using Admin SDK
     */
    private static async getUserByFirebaseUid(firebaseUid: string): Promise<UserProfile | null> {
      try {
        if (!firebaseUid) {
          throw new Error('Firebase UID is required');
        }
        
        const userDoc = await this.getFirestore().collection('users').doc(firebaseUid).get();
        if (!userDoc.exists) return null;
        
        return {
          ...userDoc.data() as UserProfile,
          firebaseUid: userDoc.id
        };
      } catch (error) {
        console.error('Error finding user by Firebase UID:', error);
        throw error;
      }
    }

    /**
     * Server-side method to update user profile using Admin SDK
     */
    private static async updateUserProfile(firebaseUid: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
      try {
        const userRef = this.getFirestore().collection('users').doc(firebaseUid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
          throw new Error('User profile not found');
        }
        
        // Ensure updates include updatedAt timestamp
        const timestampedUpdates = {
          ...updates,
          updatedAt: Date.now()
        };
        
        await userRef.update(timestampedUpdates);
        
        // Return the updated profile
        return await this.getUserByFirebaseUid(firebaseUid);
      } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }
    }

  // Collection references
  private static readonly USERS_COLLECTION = 'users';
  private static readonly SUBSCRIPTIONS_COLLECTION = 'subscriptions';
  private static readonly STRIPE_CUSTOMERS_COLLECTION = 'stripe_customers';
  
  // Subscription plan configuration
  private static readonly PREMIUM_PLAN = {
    id: 'price_1Rq6EKP3DqdzB0CltTMyPA3N',
    name: 'Premium',
    price: 999, // $9.99 in cents
    currency: 'usd',
    interval: 'month'
  };

  /**
   * Creates a Payment Intent for embedded subscription payments
   */
  static async createPaymentIntent(userId: string): Promise<{ clientSecret: string; customerId: string }> {
    try {
      // Get or create Stripe customer
      const customerId = await this.getOrCreateStripeCustomer(userId);
      
      // Create payment intent
      const paymentIntent = await this.getStripe().paymentIntents.create({
        amount: this.PREMIUM_PLAN.price,
        currency: this.PREMIUM_PLAN.currency,
        customer: customerId,
        metadata: {
          userId: userId,
          priceId: this.PREMIUM_PLAN.id,
          type: 'subscription'
        },
        automatic_payment_methods: {
          enabled: true,
        },
        payment_method_options: {
          card: {
            setup_future_usage: 'off_session',
          },
        },
        setup_future_usage: 'off_session',
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        customerId,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Creates a Stripe checkout session for subscription (legacy method)
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
   * Confirms a payment and creates subscription
   */
  static async confirmPayment(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await this.getStripe().paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const userId = paymentIntent.metadata.userId;
        if (userId) {
          // Upgrade user to premium
          await this.updateMembershipTier(userId, 'premium');
          console.log(`User ${userId} upgraded to premium via payment intent ${paymentIntentId}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }

  /**
   * Creates a subscription from a successful payment intent
   */
  static async createSubscriptionFromPayment(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await this.getStripe().paymentIntents.retrieve(paymentIntentId, {
        expand: ['payment_method']
      });
      
      if (paymentIntent.status !== 'succeeded') {
        console.error('Payment intent not succeeded:', paymentIntent.status);
        return false;
      }

      const userId = paymentIntent.metadata.userId;
      if (!userId) {
        console.error('No userId in payment intent metadata');
        return false;
      }

      const customerId = paymentIntent.customer as string;
      // Extract payment method ID - it could be a string or expanded object
      const paymentMethodId = typeof paymentIntent.payment_method === 'string' 
        ? paymentIntent.payment_method 
        : (paymentIntent.payment_method as any)?.id;

      if (!paymentMethodId) {
        console.error('No payment method found on payment intent');
        return false;
      }

      // Attach the payment method to the customer for future use
      await this.getStripe().paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await this.getStripe().customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create the subscription
      const subscription = await this.getStripe().subscriptions.create({
        customer: customerId,
        items: [
          {
            price: this.PREMIUM_PLAN.id,
          },
        ],
        default_payment_method: paymentMethodId,
        metadata: {
          userId: userId,
          createdFrom: 'embedded_checkout',
        },
      });

      if (subscription.status === 'active') {
        // Update user to premium
        await this.updateMembershipTier(userId, 'premium');
        console.log(`Subscription ${subscription.id} created for user ${userId}`);
        return true;
      } else {
        console.error('Subscription not active:', subscription.status);
        return false;
      }
    } catch (error) {
      console.error('Error creating subscription from payment:', error);
      return false;
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
      const userProfile = await this.getUserByFirebaseUid(userId);
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
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
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
   * Handles successful Payment Intent (embedded checkout)
   */
  private static async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const userId = paymentIntent.metadata?.userId;
    if (!userId) {
      console.error('No userId in payment intent metadata');
      return;
    }

    // Update user to premium
    await this.updateMembershipTier(userId, 'premium');
    
    console.log(`User ${userId} upgraded to premium via payment intent ${paymentIntent.id}`);
  }

  /**
   * Handles successful checkout completion (hosted checkout)
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
      const userProfile = await this.getUserByFirebaseUid(firebaseUid);
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
      await this.updateUserProfile(firebaseUid, {
        membershipTier: tier,
        refreshesRemaining: refreshesLimit,
        refreshResetTime: Date.now()
      });
      
      // Record the subscription change
      await this.recordSubscriptionChange(firebaseUid, tier);
      
      // Return the updated profile
      return await this.getUserByFirebaseUid(firebaseUid);
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
        previousTier: (await this.getUserByFirebaseUid(firebaseUid))?.membershipTier || 'free',
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