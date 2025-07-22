#!/bin/bash

echo "Deploying Firebase Storage rules..."
echo "Make sure you have Firebase CLI installed and are logged in."

# Deploy storage rules
firebase deploy --only storage

echo "Storage rules deployed successfully!"
echo "You can now test avatar uploads." 