# Email Verification Troubleshooting Guide

## Root Causes Identified

Based on the diagnostic analysis, here are the main reasons why users aren't receiving verification emails:

### 1. **Firebase Default Email Configuration**
- **Issue**: Using Firebase's default email templates and sender
- **Impact**: Lower deliverability, often marked as spam
- **Solution**: Configure custom email templates in Firebase Console

### 2. **Missing ActionCodeSettings**
- **Issue**: No custom redirect URLs or app identification
- **Impact**: Generic emails that look suspicious to spam filters
- **Solution**: ✅ **FIXED** - Enhanced with custom actionCodeSettings

### 3. **Gmail Spam Filtering**
- **Issue**: Gmail aggressively filters Firebase default emails
- **Impact**: Emails go to spam or are blocked entirely
- **Solution**: Custom sender domain + email templates

## Immediate Fixes Applied

### ✅ Enhanced Email Verification (firebase.ts)
```typescript
const actionCodeSettings = {
  url: `${window.location.origin}/auth/verify-success`,
  handleCodeInApp: true,
  iOS: { bundleId: 'com.shrug.app' },
  android: { packageName: 'com.shrug.app' }
};
```

### ✅ Created Verification Success Page
- `/auth/verify-success` - Better user experience
- Handles email verification redirects properly
- Auto-redirects to dashboard after verification

### ✅ Manual Verification Scripts
- `scripts/verify-user.js` - Bypass verification for specific users
- `scripts/diagnose-email-issues.js` - Debug email problems

## Firebase Console Configuration Needed

### 1. Email Templates (HIGH PRIORITY)
1. Go to Firebase Console → Authentication → Templates
2. Edit "Email address verification" template
3. Customize:
   - **From name**: "Shrug Team" (instead of default)
   - **Reply-to**: "support@shrug.com" (your domain)
   - **Subject**: "Welcome to Shrug! Please verify your email"
   - **Body**: Custom HTML template

### 2. Authorized Domains
1. Go to Firebase Console → Authentication → Settings
2. Add your production domain to "Authorized domains"
3. This improves email deliverability

### 3. Custom Email Action Handler (OPTIONAL)
Consider implementing a custom email handler that:
- Uses your own email service (SendGrid, Mailgun)
- Has better deliverability rates
- Provides detailed delivery analytics

## Testing Strategy

### Test with Multiple Email Providers
```bash
# Test accounts to create:
- Gmail: test1@gmail.com
- Yahoo: test2@yahoo.com  
- Outlook: test3@outlook.com
- ProtonMail: test4@protonmail.com
```

### Monitor Delivery
1. Check spam folders immediately
2. Use email testing tools (Mail-Tester.com)
3. Monitor Firebase Console logs

## Usage Instructions

### For Manual Verification (Current Solution)
```bash
# Verify a specific user immediately
node scripts/verify-user.js user@example.com

# Diagnose email issues
node scripts/diagnose-email-issues.js
```

### For API-based Verification
```bash
# Use the admin endpoint
curl -X POST http://localhost:3000/api/admin/verify-user \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

## Recommended Next Steps

### Priority 1: Firebase Console Configuration
1. ✅ Update email templates (custom sender, subject, body)
2. ✅ Add authorized domains
3. ✅ Test with multiple email providers

### Priority 2: Advanced Solutions
1. Implement custom email service (SendGrid/Mailgun)
2. Add email delivery monitoring
3. Create admin dashboard for user verification

### Priority 3: Monitoring
1. Add email delivery analytics
2. Set up alerts for failed verifications
3. Regular audits of unverified users

## Current Status

- ✅ Enhanced email verification with actionCodeSettings
- ✅ Created verification success page
- ✅ Manual verification scripts ready
- ⚠️ **Still need to configure Firebase Console templates**
- ⚠️ **Need to test with multiple email providers**

## Support Process

When users report missing verification emails:

1. **Immediate**: Run verification script
   ```bash
   node scripts/verify-user.js user@example.com
   ```

2. **Follow-up**: Check their email provider and spam folder

3. **Long-term**: Implement the Firebase Console fixes above