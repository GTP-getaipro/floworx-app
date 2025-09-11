/**
 * Direct Email and Authentication Flow Testing
 * Tests the actual email delivery and authentication issues
 */

require('dotenv').config();
const axios = require('axios');
const emailService = require('./backend/services/emailService');

const BASE_URL = process.env.API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5001';
const TEST_EMAIL = 'test-email-flow@example.com';

async function testEmailAuthFlow() {
  console.log('🧪 TESTING EMAIL AND AUTHENTICATION FLOW');
  console.log('==========================================\n');

  // 1. Test Email Service Configuration
  console.log('1. 📧 Testing Email Service Configuration...');
  console.log('   SMTP_HOST:', process.env.SMTP_HOST);
  console.log('   SMTP_PORT:', process.env.SMTP_PORT);
  console.log('   SMTP_USER:', process.env.SMTP_USER);
  console.log('   FROM_EMAIL:', process.env.FROM_EMAIL);
  console.log('   FROM_NAME:', process.env.FROM_NAME);
  
  // Test SMTP connection
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.verify();
    console.log('   ✅ SMTP connection successful');
  } catch (error) {
    console.log('   ❌ SMTP connection failed:', error.message);
    if (error.message.includes('Invalid login')) {
      console.log('   🔧 ISSUE: Gmail App Password is invalid or expired');
      console.log('   📋 SOLUTION: Generate new App Password in Google Account settings');
    }
  }

  console.log('\n2. 🔐 Testing User Registration...');
  
  try {
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: TEST_EMAIL,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      businessName: 'Test Business',
      agreeToTerms: true,
      marketingConsent: false
    });

    console.log('   ✅ Registration successful');
    console.log('   📧 Email verification should be sent to:', TEST_EMAIL);
    console.log('   🔍 Check if email was actually sent...');

    // Test email service directly
    try {
      const token = emailService.generateVerificationToken();
      await emailService.sendVerificationEmail(TEST_EMAIL, 'Test', token);
      console.log('   ✅ Email service call completed');
    } catch (emailError) {
      console.log('   ❌ Email service failed:', emailError.message);
    }

  } catch (error) {
    console.log('   ❌ Registration failed:', error.response?.data || error.message);
  }

  console.log('\n3. 🔄 Testing Password Reset...');
  
  try {
    const resetResponse = await axios.post(`${BASE_URL}/api/auth/forgot-password`, {
      email: TEST_EMAIL
    });

    console.log('   ✅ Password reset initiated');
    console.log('   📧 Reset email should be sent to:', TEST_EMAIL);

    // Test password reset email service directly
    try {
      const resetToken = emailService.generateVerificationToken();
      await emailService.sendPasswordResetEmail(TEST_EMAIL, 'Test', resetToken);
      console.log('   ✅ Password reset email service call completed');
    } catch (emailError) {
      console.log('   ❌ Password reset email failed:', emailError.message);
    }

  } catch (error) {
    console.log('   ❌ Password reset failed:', error.response?.data || error.message);
  }

  console.log('\n4. 🔍 Diagnosing Email Issues...');
  
  // Check if server is running
  try {
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('   ✅ Server is running');
  } catch (error) {
    console.log('   ❌ Server not accessible:', error.message);
    console.log('   📋 Make sure server is running on port 5001');
    return;
  }

  // Test email templates
  console.log('\n5. 📄 Testing Email Templates...');
  try {
    const verificationHtml = emailService.getVerificationEmailTemplate('Test User', 'https://example.com/verify?token=test');
    const resetHtml = emailService.getPasswordResetTemplate('Test User', 'https://example.com/reset?token=test');
    
    console.log('   ✅ Email templates generated successfully');
    console.log('   📏 Verification email length:', verificationHtml.length, 'characters');
    console.log('   📏 Reset email length:', resetHtml.length, 'characters');
  } catch (error) {
    console.log('   ❌ Email template generation failed:', error.message);
  }

  console.log('\n📊 SUMMARY AND RECOMMENDATIONS:');
  console.log('================================');
  
  console.log('\n🔧 IMMEDIATE FIXES NEEDED:');
  console.log('1. Update Gmail App Password:');
  console.log('   - Go to Google Account settings');
  console.log('   - Enable 2-Factor Authentication');
  console.log('   - Generate new App Password for "Mail"');
  console.log('   - Update SMTP_PASS in .env file');
  
  console.log('\n2. Verify Environment Variables:');
  console.log('   - SMTP_USER should be your Gmail address');
  console.log('   - SMTP_PASS should be the 16-character App Password');
  console.log('   - FROM_EMAIL should match SMTP_USER or be authorized');
  
  console.log('\n3. Test Email Delivery:');
  console.log('   - Use a real email address for testing');
  console.log('   - Check spam/junk folders');
  console.log('   - Monitor Gmail SMTP logs if available');
  
  console.log('\n📧 CURRENT EMAIL CONFIGURATION:');
  console.log('   Host:', process.env.SMTP_HOST);
  console.log('   Port:', process.env.SMTP_PORT);
  console.log('   User:', process.env.SMTP_USER);
  console.log('   From:', process.env.FROM_EMAIL);
  console.log('   Pass:', process.env.SMTP_PASS ? '[SET]' : '[NOT SET]');
}

// Run the test
if (require.main === module) {
  testEmailAuthFlow().catch(console.error);
}

module.exports = { testEmailAuthFlow };
