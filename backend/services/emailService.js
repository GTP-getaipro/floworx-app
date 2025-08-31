const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { pool } = require('../database/connection');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Configure email transporter with flexible SMTP settings
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS // Use App Password for Gmail
      }
    });
  }

  /**
   * Generate secure verification token
   * @returns {string} Verification token
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send email verification
   * @param {string} email - User email
   * @param {string} firstName - User first name
   * @param {string} token - Verification token
   */
  async sendVerificationEmail(email, firstName, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const htmlContent = this.getVerificationEmailTemplate(firstName, verificationUrl);
    
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Floworx Team'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to Floworx - Please Verify Your Email',
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send welcome email after verification
   * @param {string} email - User email
   * @param {string} firstName - User first name
   */
  async sendWelcomeEmail(email, firstName) {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    
    const htmlContent = this.getWelcomeEmailTemplate(firstName, dashboardUrl);
    
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Floworx Team'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to Floworx - Let\'s Get Your Email Automation Started!',
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw new Error('Failed to send welcome email');
    }
  }

  /**
   * Send onboarding reminder email
   * @param {string} email - User email
   * @param {string} firstName - User first name
   * @param {string} lastStep - Last completed step
   */
  async sendOnboardingReminder(email, firstName, lastStep) {
    const continueUrl = `${process.env.FRONTEND_URL}/dashboard`;
    
    const htmlContent = this.getOnboardingReminderTemplate(firstName, lastStep, continueUrl);
    
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Floworx Team'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Complete Your Floworx Setup - Your Email Automation Awaits!',
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Onboarding reminder sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending onboarding reminder:', error);
      throw new Error('Failed to send onboarding reminder');
    }
  }

  /**
   * Store verification token in database
   * @param {string} userId - User ID
   * @param {string} token - Verification token
   */
  async storeVerificationToken(userId, token) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const query = `
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, created_at = CURRENT_TIMESTAMP
    `;
    
    await pool.query(query, [userId, token, expiresAt]);
  }

  /**
   * Verify email token
   * @param {string} token - Verification token
   * @returns {Object} Verification result
   */
  async verifyEmailToken(token) {
    const query = `
      SELECT evt.user_id, u.email, u.first_name
      FROM email_verification_tokens evt
      JOIN users u ON evt.user_id = u.id
      WHERE evt.token = $1 AND evt.expires_at > CURRENT_TIMESTAMP
    `;
    
    const result = await pool.query(query, [token]);
    
    if (result.rows.length === 0) {
      return { valid: false, message: 'Invalid or expired verification token' };
    }

    const { user_id, email, first_name } = result.rows[0];

    // Mark email as verified
    await pool.query(
      'UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user_id]
    );

    // Delete used token
    await pool.query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);

    // Send welcome email
    await this.sendWelcomeEmail(email, first_name);

    return { 
      valid: true, 
      userId: user_id, 
      email, 
      firstName: first_name 
    };
  }

  /**
   * Get verification email template
   */
  getVerificationEmailTemplate(firstName, verificationUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Floworx</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; border-radius: 0 0 10px 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Welcome to Floworx!</h1>
                <p>Your Intelligent Email Automation Platform</p>
            </div>
            <div class="content">
                <h2>Hi ${firstName || 'there'}!</h2>
                <p>Thank you for signing up for Floworx! We're excited to help you automate your email management and grow your hot tub business.</p>
                
                <p>To get started, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="button">Verify My Email Address</a>
                </div>
                
                <p>Once verified, you'll be able to:</p>
                <ul>
                    <li>🤖 Set up AI-powered email automation</li>
                    <li>📧 Automatically categorize and route emails</li>
                    <li>👥 Configure team notifications</li>
                    <li>📊 Track email performance and insights</li>
                </ul>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
                
                <p><strong>This verification link expires in 24 hours.</strong></p>
            </div>
            <div class="footer">
                <p>Need help? Contact us at <a href="mailto:support@floworx-iq.com">support@floworx-iq.com</a></p>
                <p>© 2024 Floworx. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Get welcome email template
   */
  getWelcomeEmailTemplate(firstName, dashboardUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Floworx - Let's Get Started!</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .step { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; border-radius: 0 0 10px 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Email Verified Successfully!</h1>
                <p>You're ready to start automating your emails</p>
            </div>
            <div class="content">
                <h2>Great job, ${firstName || 'there'}!</h2>
                <p>Your email has been verified and your Floworx account is now active. Let's get your email automation set up in just a few minutes!</p>
                
                <div style="text-align: center;">
                    <a href="${dashboardUrl}" class="button">Start My Setup Journey</a>
                </div>
                
                <h3>What happens next?</h3>
                
                <div class="step">
                    <strong>Step 1: Connect Your Google Account</strong>
                    <p>Securely connect your Gmail to enable email monitoring and automation.</p>
                </div>
                
                <div class="step">
                    <strong>Step 2: Define Your Email Categories</strong>
                    <p>Tell us about the types of emails your business receives (leads, support, etc.).</p>
                </div>
                
                <div class="step">
                    <strong>Step 3: Set Up Team Notifications</strong>
                    <p>Configure which team members get notified for different email types.</p>
                </div>
                
                <div class="step">
                    <strong>Step 4: Activate Automation</strong>
                    <p>Launch your intelligent email automation and start seeing results immediately!</p>
                </div>
                
                <p><strong>The entire setup takes less than 10 minutes and you'll see immediate results.</strong></p>
            </div>
            <div class="footer">
                <p>Questions? We're here to help at <a href="mailto:support@floworx-iq.com">support@floworx-iq.com</a></p>
                <p>© 2024 Floworx. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Get onboarding reminder template
   */
  getOnboardingReminderTemplate(firstName, lastStep, continueUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Floworx Setup</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .progress { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #FF6B35; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; border-radius: 0 0 10px 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⏰ Don't Miss Out!</h1>
                <p>Your email automation is waiting</p>
            </div>
            <div class="content">
                <h2>Hi ${firstName || 'there'},</h2>
                <p>You started setting up your Floworx email automation but haven't finished yet. You're so close to having intelligent email management for your business!</p>
                
                <div class="progress">
                    <strong>Your Progress:</strong> You completed the ${lastStep || 'initial'} step.
                    <br><small>Just a few more minutes and you'll have full email automation running!</small>
                </div>
                
                <p><strong>Why complete your setup now?</strong></p>
                <ul>
                    <li>🚀 Start automating emails immediately</li>
                    <li>⏱️ Save hours of manual email management</li>
                    <li>📈 Never miss important customer emails again</li>
                    <li>👥 Keep your team informed automatically</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="${continueUrl}" class="button">Continue My Setup</a>
                </div>
                
                <p><em>This will only take a few more minutes, and you'll see the benefits immediately!</em></p>
            </div>
            <div class="footer">
                <p>Need assistance? Reply to this email or contact <a href="mailto:support@floworx-iq.com">support@floworx-iq.com</a></p>
                <p>© 2024 Floworx. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();
