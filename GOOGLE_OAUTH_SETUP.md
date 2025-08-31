# Google OAuth Setup Guide for Floworx

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it "Floworx" or similar

## Step 2: Enable Gmail API

1. Go to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - App name: "Floworx"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Name: "Floworx Web Client"
5. Authorized redirect URIs:
   - `http://localhost:3000/api/oauth/google/callback` (for development)
   - `https://your-vercel-url.vercel.app/api/oauth/google/callback` (for production)

## Step 5: Get Your Credentials

After creating, you'll get:
- Client ID (starts with numbers, ends with .googleusercontent.com)
- Client Secret (random string)

## Step 6: Update Environment Variables

Replace in your `.env` file:
```
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

## Step 7: Test the Integration

Once configured, the "Connect Your Google Account" button should work!
