/**
 * Gmail App Password Fix Script
 * Removes spaces and validates format
 */

require('dotenv').config();

console.log('🔧 GMAIL APP PASSWORD FIX');
console.log('==========================\n');

const currentPassword = process.env.SMTP_PASS;

if (currentPassword) {
  console.log('📧 CURRENT APP PASSWORD ANALYSIS:');
  console.log('   Length:', currentPassword.length, 'characters');
  console.log('   Contains spaces:', currentPassword.includes(' ') ? 'YES ❌' : 'NO ✅');
  
  // Remove spaces and show corrected version
  const correctedPassword = currentPassword.replace(/\s/g, '');
  console.log('   Corrected length:', correctedPassword.length, 'characters');
  
  console.log('\n🛠️  CORRECTED APP PASSWORD:');
  console.log('   Original: "' + currentPassword + '"');
  console.log('   Fixed:    "' + correctedPassword + '"');
  
  console.log('\n📝 UPDATE YOUR .env FILE:');
  console.log('   Change this line in your .env file:');
  console.log('   SMTP_PASS=' + correctedPassword);
  
  if (correctedPassword.length === 16) {
    console.log('\n✅ PERFECT! The corrected password is exactly 16 characters.');
  } else {
    console.log('\n⚠️  WARNING: After removing spaces, the password is', correctedPassword.length, 'characters.');
    console.log('   Gmail App Passwords should be exactly 16 characters.');
    console.log('   You may need to generate a new App Password.');
  }
  
} else {
  console.log('❌ No SMTP_PASS found in environment variables');
}

console.log('\n🚀 NEXT STEPS:');
console.log('1. Update your .env file with the corrected password (no spaces)');
console.log('2. Save the file');
console.log('3. Restart your development server');
console.log('4. Run: node test-email-auth-flow.js');

console.log('\n💡 IF STILL NOT WORKING:');
console.log('1. Generate a completely NEW App Password from Gmail');
console.log('2. Copy it WITHOUT spaces');
console.log('3. Make sure it\'s exactly 16 characters');
console.log('4. Update .env and restart server');
