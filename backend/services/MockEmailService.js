
/**
 * Mock Email Service for Development
 * Replaces SendGrid when sender identity is not configured
 */

class MockEmailService {
  constructor() {
    this.enabled = process.env.NODE_ENV === 'development';
  }
  
  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.enabled) {
      throw new Error('Mock email service only available in development');
    }
    
    console.log('📧 Mock Email Service - Email would be sent:');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Content: ${textContent || htmlContent.substring(0, 100)}...`);
    
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
      message: 'Email sent via mock service'
    };
  }
  
  async sendVerificationEmail(email, firstName, token) {
    const subject = 'Verify Your Email Address';
    const content = `Hi ${firstName}, please verify your email with token: ${token}`;
    
    return this.sendEmail(email, subject, content);
  }
  
  async sendPasswordResetEmail(email, firstName, token) {
    const subject = 'Password Reset Request';
    const content = `Hi ${firstName}, your password reset token is: ${token}`;
    
    return this.sendEmail(email, subject, content);
  }
}

module.exports = MockEmailService;
