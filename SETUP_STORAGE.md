# Firebase Storage Setup Instructions

## Step 1: Initialize Firebase Storage
1. Go to [Firebase Console Storage](https://console.firebase.google.com/project/shrug-cc452/storage)
2. Click "Get Started"
3. Choose "Start in production mode" 
4. Select location: `us-central` (or your preferred region)
5. Click "Done"

## Step 2: Deploy Storage Rules
After Storage is initialized, run:
```bash
firebase deploy --only storage
```

## Step 3: Configure CORS (if still needed)
If you still get CORS errors after step 2, you can manually configure CORS:

### Option A: Using Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: shrug-cc452
3. Go to Cloud Storage > Buckets
4. Click on your bucket (shrug-cc452.firebasestorage.app)
5. Go to "Permissions" tab
6. Click "ADD PRINCIPAL" 
7. Add CORS configuration

### Option B: Using gsutil (if installed)
```bash
# Authenticate first
gcloud auth login

# Apply CORS configuration
gsutil cors set cors.json gs://shrug-cc452.firebasestorage.app
```

## Step 4: Test Upload
After completing the above steps, try uploading a profile picture again. The CORS error should be resolved.

## Current Error
The error you're seeing is:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/shrug-cc452.firebasestorage.app/o?name=avatars%2F...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

This happens because:
1. Firebase Storage isn't fully initialized yet, OR
2. CORS isn't configured to allow requests from localhost:3000

Following the steps above will resolve this issue.