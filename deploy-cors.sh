#!/bin/bash

# Deploy CORS configuration to Firebase Storage
echo "Deploying CORS configuration to Firebase Storage..."

# Apply CORS configuration
gsutil cors set cors.json gs://shrug-cc452.firebasestorage.app

echo "CORS configuration deployed successfully!"
echo "You may need to wait a few minutes for the changes to take effect."