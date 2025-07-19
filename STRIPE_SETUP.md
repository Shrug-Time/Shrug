# Stripe Integration Setup Guide

## 🚀 **Quick Setup (5 minutes)**

### **Step 1: Create Stripe Account**
1. Go to [stripe.com](https://stripe.com) and sign up
2. No phone calls, no sales pitch - just email + password
3. Complete basic business information

### **Step 2: Get API Keys**
1. Go to **Developers > API keys** in your Stripe dashboard
2. Copy your **Publishable key** and **Secret key**
3. Keep these secure - never commit them to git

### **Step 3: Create Product & Price**
1. Go to **Products** in your Stripe dashboard
2. Click **Add product**
3. Set up your premium subscription:
   - **Name**: Premium Subscription
   - **Price**: $9.99/month
   - **Billing**: Recurring
   - **Interval**: Monthly

### **Step 4: Set Environment Variables**
Add these to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51ABC123...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
STRIPE_WEBHOOK_SECRET=whsec_1234567890...

# Base URL for redirects
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Firebase Admin (for webhook verification)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### **Step 5: Set Up Webhook**
1. Go to **Developers > Webhooks** in Stripe dashboard
2. Click **Add endpoint**
3. Set URL to: `https://your-domain.com/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** to your env vars

## 🔧 **Testing**

### **Test Cards**
Use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`

### **Test the Integration**
1. Start your development server
2. Go to subscription page
3. Click "Subscribe Now"
4. Use test card to complete payment
5. Check that user gets premium access

## 🚨 **Important Notes**

### **Security**
- Never expose `STRIPE_SECRET_KEY` in client-side code
- Always verify webhook signatures
- Use Firebase Admin for server-side auth

### **Production**
- Switch to live keys when ready
- Update webhook URL to production domain
- Test with real cards before going live

### **Error Handling**
- The service includes comprehensive error handling
- Failed payments are logged and handled
- Users can manage subscriptions via Stripe portal

## 📊 **What's Included**

### **Features**
- ✅ Subscription checkout
- ✅ Webhook handling
- ✅ Customer portal access
- ✅ Payment failure handling
- ✅ Subscription management
- ✅ Premium content gating

### **Database Collections**
- `stripe_customers` - Maps users to Stripe customers
- `subscriptions` - Tracks subscription changes
- `users` - Updated with membership tier

### **API Endpoints**
- `POST /api/stripe/create-checkout-session` - Start subscription
- `POST /api/stripe/create-portal-session` - Manage subscription
- `POST /api/stripe/webhook` - Handle Stripe events

## 🎯 **Next Steps**

1. **Set up Stripe account** and get API keys
2. **Add environment variables** to your `.env.local`
3. **Create product/price** in Stripe dashboard
4. **Test the integration** with test cards
5. **Deploy to production** with live keys

The integration is designed to be **simple and secure** - just follow these steps and you'll have real payments working! 🚀 