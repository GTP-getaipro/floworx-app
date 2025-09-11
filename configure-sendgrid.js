/**
 * SendGrid Configuration Helper
 * Updates .env file with SendGrid settings
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 SENDGRID CONFIGURATION HELPER');
console.log('=================================\n');

// Read current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Found .env file');
} catch (error) {
  console.log('❌ Could not read .env file:', error.message);
  process.exit(1);
}

console.log('\n📧 SENDGRID CONFIGURATION:');
console.log('==========================');

console.log('\n🔑 PASTE YOUR SENDGRID API KEY HERE:');
console.log('   (It should start with "SG.")');
console.log('   Example: SG.abc123def456...');

// For now, show the configuration template
console.log('\n📝 UPDATE YOUR .env FILE WITH THESE SETTINGS:');
console.log('=============================================');

console.log('\n# Replace your Gmail settings with SendGrid:');
console.log('SMTP_HOST=smtp.sendgrid.net');
console.log('SMTP_PORT=587');
console.log('SMTP_USER=apikey');
console.log('SMTP_PASS=SG.your-sendgrid-api-key-here');
console.log('FROM_EMAIL=noreply@app.floworx-iq.com');
console.log('FROM_NAME=Floworx Team');

console.log('\n🔧 MANUAL STEPS:');
console.log('================');
console.log('1. Get your SendGrid API Key from Settings > API Keys');
console.log('2. Copy the API key (starts with SG.)');
console.log('3. Replace the Gmail settings in your .env file with the SendGrid settings above');
console.log('4. Replace "SG.your-sendgrid-api-key-here" with your actual API key');
console.log('5. Save the .env file');
console.log('6. Restart your development server: npm run dev');
console.log('7. Test: node test-email-auth-flow.js');

console.log('\n📋 DNS RECORDS STATUS:');
console.log('======================');
console.log('You need to add these CNAME records to your domain DNS:');
console.log('• em7057.app.floworx-iq.com → sendgrid.net');
console.log('• s1._domainkey.app.floworx-iq.com → sendgrid.net');
console.log('• s2._domainkey.app.floworx-iq.com → sendgrid.net');

console.log('\n⏱️  DNS PROPAGATION:');
console.log('===================');
console.log('• DNS changes can take 5-60 minutes to propagate');
console.log('• You can test email sending immediately with the API key');
console.log('• Domain authentication will improve deliverability once DNS propagates');

console.log('\n✅ BENEFITS AFTER SETUP:');
console.log('========================');
console.log('✅ Professional email delivery from app.floworx-iq.com');
console.log('✅ Better deliverability than Gmail');
console.log('✅ Email analytics and tracking');
console.log('✅ No more App Password issues');
console.log('✅ Scalable for production');

console.log('\n🎯 NEXT STEPS:');
console.log('==============');
console.log('1. Get SendGrid API Key');
console.log('2. Update .env file with SendGrid settings');
console.log('3. Add DNS records to your domain');
console.log('4. Restart server and test');
console.log('5. Verify email delivery works!');

console.log('\n📞 READY TO TEST?');
console.log('=================');
console.log('Once you update the .env file, run:');
console.log('node test-email-auth-flow.js');
console.log('');
console.log('This will test the complete email functionality with SendGrid!');
