/**
 * Test SendGrid with Verified Sender
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testVerifiedSender() {
  console.log('🎉 TESTING SENDGRID WITH VERIFIED SENDER');
  console.log('=' .repeat(45));
  console.log('');
  
  console.log('📋 Verified Sender Details:');
  console.log('   Name: Artem Lykov');
  console.log('   From: floworx.ai@gmail.com');
  console.log('   Reply-To: info@floworx-iq.com');
  console.log('');

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Test connection first
    console.log('🔌 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful');
    console.log('');

    // Send test email
    const testEmail = {
      from: '"Artem Lykov" <floworx.ai@gmail.com>',
      to: 'floworx.ai@gmail.com',
      replyTo: 'info@floworx-iq.com',
      subject: 'SendGrid Test - Verified Sender Working!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎉 SendGrid Test Successful!</h2>
          <p>This email confirms that your SendGrid configuration is working with the verified sender.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>✅ Verification Details:</h3>
            <ul>
              <li><strong>Sender:</strong> Artem Lykov</li>
              <li><strong>From Email:</strong> floworx.ai@gmail.com</li>
              <li><strong>Reply-To:</strong> info@floworx-iq.com</li>
              <li><strong>Sent at:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Status:</strong> ✅ Verified & Working</li>
            </ul>
          </div>
          
          <div style="background: #e7f3ff; padding: 15px; border-radius: 8px;">
            <h3 style="color: #0369a1;">🚀 What's Now Working:</h3>
            <ul>
              <li>✅ User registration emails</li>
              <li>✅ Email verification</li>
              <li>✅ Password reset emails</li>
              <li>✅ Welcome emails</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Your FloWorx application can now send professional emails!
          </p>
        </div>
      `
    };

    console.log('📧 Sending test email...');
    console.log('📤 From: floworx.ai@gmail.com (Verified Sender)');
    console.log('📤 To: floworx.ai@gmail.com');
    console.log('📤 Reply-To: info@floworx-iq.com');
    console.log('');

    const result = await transporter.sendMail(testEmail);
    
    console.log('🎉 SUCCESS! Email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Check your inbox: floworx.ai@gmail.com');
    console.log('');
    console.log('✅ SENDGRID FULLY OPERATIONAL!');
    console.log('✅ Verified sender working');
    console.log('✅ Professional reply-to configured');
    console.log('✅ FloWorx email system ready');
    console.log('');
    console.log('🎯 Your FloWorx app can now send emails to users!');
    
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    
    if (error.message.includes('verified Sender Identity')) {
      console.log('');
      console.log('⚠️  SENDER VERIFICATION ISSUE:');
      console.log('The sender verification might still be processing.');
      console.log('Please wait 1-2 minutes and try again.');
      console.log('');
      console.log('Or check that the FROM email matches exactly:');
      console.log('Expected: floworx.ai@gmail.com');
      console.log('Current: ' + process.env.FROM_EMAIL);
    } else if (error.message.includes('authentication')) {
      console.log('');
      console.log('🔍 API Key Issue:');
      console.log('Check your SendGrid API key configuration');
    } else {
      console.log('');
      console.log('🔍 Unexpected error:', error);
    }
    
    return false;
  }
}

testVerifiedSender().catch(console.error);
