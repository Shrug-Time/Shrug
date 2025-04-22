# Vercel Deployment Guide

This document provides instructions for deploying the Shrug platform to Vercel.

## Prerequisites

- A Vercel account
- Access to the project's GitHub repository
- Firebase project configuration

## Deployment Steps

### 1. Configure Vercel Project

1. Create a new project in Vercel
2. Connect your GitHub repository
3. Configure the following settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build:clean`
   - **Install Command**: `npm install`
   - **Output Directory**: `.next` (default)

### 2. Environment Variables

Set up the following environment variables in your Vercel project settings:

```
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Admin SDK Configuration
FIREBASE_ADMIN_PROJECT_ID=your_admin_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_admin_client_email
FIREBASE_ADMIN_PRIVATE_KEY=your_admin_private_key
```

Make sure to use the same values as in your `.env.local` file.

### 3. Deploy

1. Click the "Deploy" button in Vercel
2. Wait for the deployment to complete
3. Once deployed, Vercel will provide a URL to access your application

## Troubleshooting

### ESLint Errors During Build

The project includes many ESLint warnings and errors that could prevent a successful build. To bypass these issues, we've created a custom build script (`build:clean`) that uses the `--no-lint` flag with Next.js build.

If you encounter build failures:

1. Check the Vercel deployment logs
2. Verify that the correct build command (`npm run build:clean`) is being used
3. Ensure all environment variables are properly set

### Custom Domain Setup

To set up a custom domain:

1. Go to your Vercel project settings
2. Navigate to the "Domains" section
3. Add your custom domain
4. Follow Vercel's instructions for DNS configuration

## CI/CD with GitHub

The project is configured to automatically deploy when changes are pushed to the main branch. For feature branches:

1. Push your changes to a feature branch
2. Vercel will create a preview deployment
3. Review the preview deployment before merging to main
4. Once merged to main, Vercel will automatically deploy to production

## Maintenance

- Regularly check for Next.js and package updates
- Monitor Vercel usage and configure budget alerts if needed
- Review deployment logs periodically for any issues 