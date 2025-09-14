/**
 * Test actual email sending functionality
 */

const emailService = require('../services/emailService');

async function testEmailSending() {
  console.log('📧 Testing Email Sending...\n');

  try {
    // Test email sending with a test email
    console.log('1. Testing verification email sending...');
    
    const testEmail = 'test-email-verification@example.com';
    const testFirstName = 'TestUser';
    const testToken = emailService.generateVerificationToken();
    
    console.log(`   Sending to: ${testEmail}`);
    console.log(`   Token: ${testToken.substring(0, 16)}...`);
    
    try {
      const result = await emailService.sendVerificationEmail(testEmail, testFirstName, testToken);
      console.log(`   ✅ Email sent successfully!`);
      console.log(`   Message ID: ${result.messageId}`);
    } catch (emailError) {
      console.log(`   ❌ Email sending failed: ${emailError.message}`);
      console.log(`   Error type: ${emailError.constructor.name}`);
      console.log(`   Error stack:`, emailError.stack);
      
      // Check if it's an authentication issue
      if (emailError.message.includes('authentication') || emailError.message.includes('auth')) {
        console.log(`   🔍 This appears to be an SMTP authentication issue`);
      }
      
      // Check if it's a network issue
      if (emailError.message.includes('ENOTFOUND') || emailError.message.includes('timeout')) {
        console.log(`   🔍 This appears to be a network connectivity issue`);
      }
    }

    // Test 2: Check transporter configuration
    console.log('\n2. Testing SMTP transporter configuration...');
    
    try {
      // Create a new instance to test transporter
      const testTransporter = emailService.createTransporter();
      console.log(`   ✅ Transporter created successfully`);
      
      // Test connection
      console.log('   Testing SMTP connection...');
      const isConnected = await testTransporter.verify();
      console.log(`   ✅ SMTP connection verified: ${isConnected}`);
      
    } catch (transportError) {
      console.log(`   ❌ SMTP connection failed: ${transportError.message}`);
      console.log(`   Error details:`, transportError);
    }

    console.log('\n📧 Email sending test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testEmailSending();
}

module.exports = { testEmailSending };
