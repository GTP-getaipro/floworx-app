#!/bin/bash

# QUICK FIX FOR FLOWORX DEPLOYMENT ISSUES
# =======================================

echo "🔧 FloWorx Deployment Quick Fix"
echo "==============================="

# Step 1: Clean and rebuild frontend
echo "📦 Step 1: Rebuilding frontend..."
cd frontend
rm -rf build node_modules package-lock.json
npm install
npm run build

if [ ! -d "build" ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi

echo "✅ Frontend build completed"

# Step 2: Check build contents
echo "📊 Step 2: Verifying build contents..."
ls -la build/
ls -la build/static/

# Step 3: Test local serving (optional)
echo "🧪 Step 3: Testing build locally..."
cd ..
node -e "
const express = require('express');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname, 'frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});
const server = app.listen(3001, () => {
  console.log('✅ Local test server running on http://localhost:3001');
  console.log('🔍 Test the app, then press Ctrl+C to continue');
});
"

echo "🎉 Quick fix completed!"
echo "📋 Next steps:"
echo "   1. Commit and push changes"
echo "   2. Wait 3 minutes for deployment"
echo "   3. Test the application"
