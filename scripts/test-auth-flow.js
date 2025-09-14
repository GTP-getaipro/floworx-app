#!/usr/bin/env node

/**
 * Authentication Flow Testing
 * Tests complete user registration, login, and JWT validation
 */

const https = require('https');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

console.log('🔐 AUTHENTICATION FLOW TESTING');
);
  console.log('Success:', result.success ? '✅ YES' : '❌ NO');
  if (result.testUser) {
    console.log('Test User:', result.testUser);
  }
  if (result.token) {
    console.log('Token:', result.token);
  }
  if (result.error) {
    console.log('Error:', result.error);
  }
}).catch(console.error);
