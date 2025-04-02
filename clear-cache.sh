#!/bin/bash
# Script to clear Next.js cache and reinstall dependencies if needed

echo "🧹 Cleaning Next.js cache..."

# Stop any running Next.js processes
echo "Stopping any running Next.js processes..."
pkill -f "node.*next" || echo "No Next.js processes found"

# Clear the Next.js build cache
echo "Removing .next directory..."
rm -rf .next

# Clear the Node.js cache
echo "Clearing Node.js module cache..."
rm -rf node_modules/.cache

# Optionally rebuild the application
if [[ "$1" == "--rebuild" ]]; then
  echo "🔨 Rebuilding application..."
  npm run build
fi

echo "✅ Cache cleared successfully!"
echo "Run 'npm run dev' to start the development server with a clean cache." 