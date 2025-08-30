#!/usr/bin/env node

/**
 * Floworx Setup Script
 * Generates secure keys and helps configure the application
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🚀 Floworx Application Setup\n');

// Generate secure keys
const generateJWTSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('base64').slice(0, 32);
};

// Create backend .env file if it doesn't exist
const createBackendEnv = () => {
  const envPath = path.join(__dirname, 'backend', '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  Backend .env file already exists. Skipping creation.');
    return;
  }

  const jwtSecret = generateJWTSecret();
  const encryptionKey = generateEncryptionKey();

  const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=floworx_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration (Generated)
JWT_SECRET=${jwtSecret}

# Encryption Key for OAuth tokens (Generated)
ENCRYPTION_KEY=${encryptionKey}

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/oauth/google/callback

# n8n Configuration
N8N_WEBHOOK_URL=your_n8n_webhook_url_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:3000
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created backend/.env with secure keys');
  console.log('🔑 JWT Secret generated');
  console.log('🔐 Encryption key generated');
};

// Create frontend .env file if it doesn't exist
const createFrontendEnv = () => {
  const envPath = path.join(__dirname, 'frontend', '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  Frontend .env file already exists. Skipping creation.');
    return;
  }

  const envContent = `# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created frontend/.env');
};

// Display setup instructions
const displayInstructions = () => {
  console.log('\n📋 Next Steps:\n');
  
  console.log('1. 🗄️  Set up PostgreSQL database:');
  console.log('   - Create database: CREATE DATABASE floworx_db;');
  console.log('   - Run schema: psql -d floworx_db -f backend/database/schema.sql\n');
  
  console.log('2. 🔧 Configure environment variables:');
  console.log('   - Edit backend/.env with your database credentials');
  console.log('   - Add your Google OAuth credentials');
  console.log('   - Add your n8n webhook URL (optional)\n');
  
  console.log('3. 🌐 Set up Google OAuth:');
  console.log('   - Go to Google Cloud Console');
  console.log('   - Create OAuth 2.0 credentials');
  console.log('   - Add redirect URI: http://localhost:5000/api/oauth/google/callback\n');
  
  console.log('4. 📦 Install dependencies:');
  console.log('   npm run install-all\n');
  
  console.log('5. 🚀 Start the application:');
  console.log('   npm run dev\n');
  
  console.log('6. 🌍 Access the application:');
  console.log('   Frontend: http://localhost:3000');
  console.log('   Backend API: http://localhost:5000\n');
  
  console.log('📚 For detailed instructions, see README.md');
};

// Main setup function
const runSetup = () => {
  try {
    createBackendEnv();
    createFrontendEnv();
    displayInstructions();
    console.log('\n🎉 Setup completed successfully!');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

// Run setup
runSetup();
