const nodemailer = require('nodemailer');
require('dotenv').config();

// Debug nodemailer import
console.log('Nodemailer version:', nodemailer.version || 'unknown');
console.log('createTransport available:', typeof nodemailer.createTransport);

/**
 * Test Email Service Configuration
 * Verifies SMTP settings and sends test emails
 */

async function testEmailService() {
  console.log('📧 Testing Email Service Configuration...\n');

  const results = {
    environmentCheck: false,
    smtpConnection: false,
    testEmailSent: false,
    templateRendering: false
  };

  // =====================================================
  // 1. ENVIRONMENT VARIABLES CHECK
  // =====================================================
  console.log('1. Checking email environment variables...');
  
  const requiredEmailVars = {
    'SMTP_HOST': process.env.SMTP_HOST,
    'SMTP_PORT': process.env.SMTP_PORT,
    'SMTP_USER': process.env.SMTP_USER,
    'SMTP_PASS': process.env.SMTP_PASS,
    'FROM_EMAIL': process.env.FROM_EMAIL,
    'FROM_NAME': process.env.FROM_NAME
  };

  const missingVars = [];
  const placeholderVars = [];

  for (const [varName, value] of Object.entries(requiredEmailVars)) {
    if (!value) {
      missingVars.push(varName);
      console.log(`   ❌ ${varName}: Missing`);
    } else if (value.includes('your-') || value.includes('your_')) {
      placeholderVars.push(varName);
      console.log(`   ⚠️  ${varName}: Has placeholder value`);
    } else {
      console.log(`   ✅ ${varName}: Configured`);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing email variables: ${missingVars.join(', ')}`);
    return results;
  }

  if (placeholderVars.length > 0) {
    console.log(`\n⚠️  Placeholder values found: ${placeholderVars.join(', ')}`);
    console.log('📖 See email setup guide below\n');
  } else {
    results.environmentCheck = true;
    console.log('   ✅ All email environment variables configured\n');
  }

  // =====================================================
  // 2. SMTP CONNECTION TEST
  // =====================================================
  console.log('2. Testing SMTP connection...');
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log('   ✅ SMTP connection successful');
    console.log(`   📧 Using: ${process.env.SMTP_USER} via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    results.smtpConnection = true;
  } catch (err) {
    console.log(`   ❌ SMTP connection failed: ${err.message}`);
    
    // Provide specific error guidance
    if (err.message.includes('authentication')) {
      console.log('   💡 Authentication error - check username/password');
      console.log('   💡 For Gmail: Use App Password, not regular password');
    } else if (err.message.includes('connection')) {
      console.log('   💡 Connection error - check host/port settings');
    }
  }

  // =====================================================
  // 3. EMAIL TEMPLATE RENDERING TEST
  // =====================================================
  console.log('\n3. Testing email template rendering...');
  
  try {
    // Test if we can load the email service
    const emailService = require('../backend/services/emailService');
    
    // Test template rendering
    const testTemplate = emailService.getVerificationEmailTemplate(
      'Test User',
      'https://example.com/verify?token=test123'
    );
    
    if (testTemplate && testTemplate.includes('Test User') && testTemplate.includes('verify?token=test123')) {
      console.log('   ✅ Email templates rendering correctly');
      results.templateRendering = true;
    } else {
      console.log('   ❌ Email template rendering failed');
    }
  } catch (err) {
    console.log(`   ❌ Email service loading failed: ${err.message}`);
  }

  // =====================================================
  // 4. TEST EMAIL SENDING (Optional)
  // =====================================================
  console.log('\n4. Test email sending...');
  
  if (results.smtpConnection && process.env.SMTP_USER && !process.env.SMTP_USER.includes('your-')) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const testEmail = {
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to: process.env.SMTP_USER, // Send test email to yourself
        subject: '🧪 Floworx Email Service Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">✅ Email Service Test Successful!</h2>
            <p>This is a test email from your Floworx email service configuration.</p>
            <p><strong>Configuration Details:</strong></p>
            <ul>
              <li>SMTP Host: ${process.env.SMTP_HOST}</li>
              <li>SMTP Port: ${process.env.SMTP_PORT}</li>
              <li>From Email: ${process.env.FROM_EMAIL}</li>
              <li>From Name: ${process.env.FROM_NAME}</li>
            </ul>
            <p>Your email service is working correctly and ready for production!</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              This test was sent on ${new Date().toLocaleString()}
            </p>
          </div>
        `
      };

      console.log('   📤 Sending test email...');
      const result = await transporter.sendMail(testEmail);
      console.log('   ✅ Test email sent successfully!');
      console.log(`   📧 Message ID: ${result.messageId}`);
      console.log(`   📬 Check your inbox: ${process.env.SMTP_USER}`);
      results.testEmailSent = true;
    } catch (err) {
      console.log(`   ❌ Test email failed: ${err.message}`);
    }
  } else {
    console.log('   ⚪ Skipping test email (SMTP connection not available)');
  }

  // =====================================================
  // 5. SUMMARY
  // =====================================================
  console.log('\n📊 Email Service Test Summary:');
  console.log(`   Environment Check: ${results.environmentCheck ? '✅' : '❌'}`);
  console.log(`   SMTP Connection: ${results.smtpConnection ? '✅' : '❌'}`);
  console.log(`   Template Rendering: ${results.templateRendering ? '✅' : '❌'}`);
  console.log(`   Test Email Sent: ${results.testEmailSent ? '✅' : '⚪'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = 3; // Don't count test email as required

  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} core tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 Email service is fully configured and working!');
  } else if (passedTests >= 2) {
    console.log('✅ Email service mostly working. Address remaining issues.');
  } else {
    console.log('❌ Email service needs configuration. See setup guide below.');
  }

  // =====================================================
  // 6. SETUP GUIDANCE
  // =====================================================
  if (!results.environmentCheck || !results.smtpConnection) {
    console.log('\n📋 Email Service Setup Guide:');
    console.log('');
    
    if (process.env.SMTP_HOST === 'smtp.gmail.com') {
      console.log('🔧 Gmail SMTP Setup:');
      console.log('   1. Go to Google Account settings');
      console.log('   2. Enable 2-Factor Authentication');
      console.log('   3. Generate App Password for "Mail"');
      console.log('   4. Use App Password (not regular password) for SMTP_PASS');
      console.log('   5. Update environment variables:');
      console.log('      SMTP_USER=your-gmail@gmail.com');
      console.log('      SMTP_PASS=your-16-character-app-password');
    } else {
      console.log('🔧 Custom SMTP Setup:');
      console.log('   1. Get SMTP credentials from your email provider');
      console.log('   2. Update environment variables with correct values');
      console.log('   3. Test connection with: node scripts/test-email-service.js');
    }
    
    console.log('');
    console.log('📖 For detailed setup: ENVIRONMENT_SETUP_GUIDE.md');
  }

  return results;
}

// Run test if called directly
if (require.main === module) {
  testEmailService()
    .then(results => {
      const coreTestsPassed = results.environmentCheck && results.smtpConnection && results.templateRendering;
      process.exit(coreTestsPassed ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ Email service test failed:', err);
      process.exit(1);
    });
}

module.exports = { testEmailService };
