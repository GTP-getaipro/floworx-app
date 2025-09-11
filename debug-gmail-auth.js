/**
 * Gmail Authentication Debug Script
 * Helps diagnose and fix Gmail App Password issues
 */

require('dotenv').config();

console.log('🔍 GMAIL AUTHENTICATION DEBUG');
console.log('==============================\n');

console.log('📧 CURRENT CONFIGURATION:');
console.log('   SMTP_HOST:', process.env.SMTP_HOST);
console.log('   SMTP_PORT:', process.env.SMTP_PORT);
console.log('   SMTP_USER:', process.env.SMTP_USER);
console.log('   FROM_EMAIL:', process.env.FROM_EMAIL);

// Check App Password format
const appPassword = process.env.SMTP_PASS;
if (appPassword) {
  console.log('   SMTP_PASS: [PRESENT]');
  console.log('   Length:', appPassword.length, 'characters');
  console.log('   Format check:');
  
  // Check for common issues
  if (appPassword.includes(' ')) {
    console.log('   ⚠️  WARNING: App Password contains spaces');
    console.log('   💡 TIP: Remove all spaces from the App Password');
  }
  
  if (appPassword.length !== 16) {
    console.log('   ⚠️  WARNING: App Password should be exactly 16 characters');
    console.log('   💡 Current length:', appPassword.length);
  }
  
  // Show masked password for verification
  const masked = appPassword.replace(/./g, '*').substring(0, 4) + '...' + appPassword.replace(/./g, '*').substring(appPassword.length - 4);
  console.log('   Masked format:', masked);
  
} else {
  console.log('   SMTP_PASS: [NOT SET]');
}

console.log('\n🔧 TROUBLESHOOTING STEPS:');
console.log('==========================');

console.log('\n1. 🔐 VERIFY GMAIL ACCOUNT SETUP:');
console.log('   ✓ Is 2-Factor Authentication enabled?');
console.log('   ✓ Did you generate the App Password from the correct account?');
console.log('   ✓ Is the App Password for "Mail" application type?');

console.log('\n2. 📝 CHECK APP PASSWORD FORMAT:');
console.log('   ✓ Should be exactly 16 characters');
console.log('   ✓ No spaces (remove all spaces)');
console.log('   ✓ Only letters and numbers');
console.log('   ✓ Example format: abcdabcdabcdabcd');

console.log('\n3. 🔄 RESTART PROCESS:');
console.log('   ✓ Save the .env file');
console.log('   ✓ Restart your development server');
console.log('   ✓ Test again');

console.log('\n4. 🧪 MANUAL TEST:');
console.log('   Try this exact format in your .env file:');
console.log('   SMTP_PASS=your16characterpassword');
console.log('   (Replace with your actual App Password, no quotes, no spaces)');

console.log('\n🚨 COMMON ISSUES & SOLUTIONS:');
console.log('==============================');

console.log('\n❌ Issue: "Username and Password not accepted"');
console.log('✅ Solutions:');
console.log('   1. Generate a completely NEW App Password');
console.log('   2. Make sure you\'re using the floworx.ai@gmail.com account');
console.log('   3. Remove ALL spaces from the App Password');
console.log('   4. Don\'t use quotes around the password in .env');

console.log('\n❌ Issue: App Password not working after generation');
console.log('✅ Solutions:');
console.log('   1. Wait 5-10 minutes after generating (propagation delay)');
console.log('   2. Try generating a new App Password');
console.log('   3. Check if the Gmail account has any security restrictions');

console.log('\n🔄 ALTERNATIVE: SWITCH TO SENDGRID');
console.log('===================================');
console.log('If Gmail continues to fail, switch to SendGrid:');
console.log('');
console.log('1. Sign up at: https://sendgrid.com/');
console.log('2. Get your API key');
console.log('3. Update your .env file:');
console.log('   SMTP_HOST=smtp.sendgrid.net');
console.log('   SMTP_PORT=587');
console.log('   SMTP_USER=apikey');
console.log('   SMTP_PASS=your_sendgrid_api_key');
console.log('   FROM_EMAIL=noreply@floworx-iq.com');

console.log('\n📞 IMMEDIATE ACTION ITEMS:');
console.log('==========================');
console.log('1. Generate a NEW Gmail App Password');
console.log('2. Copy it WITHOUT spaces');
console.log('3. Update SMTP_PASS in .env (no quotes)');
console.log('4. Restart your server');
console.log('5. Run: node test-email-auth-flow.js');

console.log('\n💡 NEED HELP?');
console.log('If you\'re still having issues:');
console.log('1. Double-check the Gmail account (floworx.ai@gmail.com)');
console.log('2. Verify 2FA is enabled');
console.log('3. Try a different email service (SendGrid recommended)');
console.log('4. Check Gmail security settings for any blocks');

// Test basic connection without authentication
console.log('\n🔌 TESTING BASIC SMTP CONNECTION...');
const net = require('net');
const client = net.createConnection({ port: 587, host: 'smtp.gmail.com' }, () => {
  console.log('✅ Basic connection to Gmail SMTP successful');
  client.end();
});

client.on('error', (err) => {
  console.log('❌ Basic connection failed:', err.message);
});

client.setTimeout(5000, () => {
  console.log('⏱️  Connection timeout - network issues possible');
  client.destroy();
});
