const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const nodemailer = require('nodemailer');

const { generateVerificationToken, generatePasswordResetToken } = require('../utils/tokenGenerator');
const { databaseOperations } = require('../database/database-operations');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Configure email transporter with flexible SMTP settings
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS // Use App Password for Gmail
      }
    });
  }

  /**
   * Get verified sender configuration
   * @returns {Object} Sender configuration
   */
  getSenderConfig() {
    // Use a verified sender identity for SendGrid
    const fromEmail = process.env.FROM_EMAIL || 'getai.pro@gmail.com'; // Fallback to verified email
    const fromName = process.env.FROM_NAME || 'Floworx Team';

    return {
      from: `"${fromName}" <${fromEmail}>`,
      fromEmail,
      fromName
    };
  }

  /**
   * Generate secure verification token
   * @returns {string} Verification token
   */
  generateVerificationToken() {
    return generateVerificationToken();
  }

  /**
   * Generate secure password reset token
   * @returns {string} Password reset token
   */
  generatePasswordResetToken() {
    return generatePasswordResetToken();
  }

  /**
   * Load and process email template
   * @param {string} templateName - Template file name
   * @param {Object} replacements - Key-value pairs for replacements
   * @returns {string} Processed template HTML
   */
  loadTemplate(templateName, replacements = {}) {
    try {
      const templatePath = path.join(__dirname, '../templates', templateName);
      let template = fs.readFileSync(templatePath, 'utf8');

      // Replace template placeholders
      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, value);
      }

      return template;
    } catch (error) {
      console.error('Failed to load email template:', error);
      return this.getFallbackTemplate(replacements);
    }
  }

  /**
   * Get fallback template when main template fails to load
   * @param {Object} replacements - Template replacements
   * @returns {string} Fallback HTML template
   */
  getFallbackTemplate(replacements = {}) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">FloworxInvite</h2>
          <h3>Email Verification Required</h3>
          <p>Please click the link below to verify your email address:</p>
          <a href="${replacements.verification_url || '#'}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
          <p>If the button doesn't work, copy and paste this link: ${replacements.verification_url || ''}</p>
          <p>This link will expire in 24 hours.</p>
          <p>Best regards,<br>The FloworxInvite Team</p>
        </body>
      </html>
    `;
  }

  /**
   * Send email verification
   * @param {string} email - User email
   * @param {string} firstName - User first name
   * @param {string} token - Verification token
   */
  async sendVerificationEmail(email, firstName, token) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/verify-email?token=${token}`;

    // Use new template system
    const htmlContent = this.loadTemplate('verification-email.html', {
      verification_url: verificationUrl,
      first_name: firstName || 'there',
      current_year: new Date().getFullYear()
    });

    const senderConfig = this.getSenderConfig();

    const mailOptions = {
      from: senderConfig.from,
      to: email,
      subject: 'Verify Your Email Address - FloworxInvite',
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} resetUrl - Password reset URL with token
   * @returns {Promise<Object>} Result object
   */
  async sendPasswordResetEmail(email, resetUrl) {
    // Use new template system
    const htmlContent = this.loadTemplate('password-reset-email.html', {
      reset_url: resetUrl,
      current_year: new Date().getFullYear(),
      expiry_hours: '1' // Token valid for 1 hour
    });

    const senderConfig = this.getSenderConfig();

    const mailOptions = {
      from: senderConfig.from,
      to: email,
      subject: 'Reset Your Password - FloworxInvite',
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
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

    const senderConfig = this.getSenderConfig();

    const mailOptions = {
      from: senderConfig.from,
      to: email,
      subject: "Welcome to Floworx - Let's Get Your Email Automation Started!",
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
   * Send generic email with template support
   * @param {Object} options - Email options
   */
  async sendEmail(options) {
    const { to, subject, template, data, html } = options;

    let htmlContent = html;

    // Use template if specified
    if (template && !html) {
      switch (template) {
        case 'password-reset':
          htmlContent = this.getPasswordResetTemplate(data.firstName, data.resetUrl, data.expiryMinutes);
          break;
        case 'password-reset-confirmation':
          htmlContent = this.getPasswordResetConfirmationTemplate(data.firstName, data.loginUrl);
          break;
        case 'account-recovery':
          htmlContent = this.getAccountRecoveryTemplate(
            data.firstName,
            data.recoveryUrl,
            data.recoveryType,
            data.expiryTime
          );
          break;
        default:
          throw new Error(`Unknown email template: ${template}`);
      }
    }

    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Floworx Team'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}: ${subject}`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Store verification token in database
   * @param {string} userId - User ID
   * @param {string} token - Verification token
   * @param {string} email - User email
   * @param {string} firstName - User first name
   */
  async storeVerificationToken(userId, token, _email = '', _firstName = '') {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      console.log(`📧 Storing verification token for user ${userId}...`);

      // Use new database operations method
      const result = await databaseOperations.storeVerificationToken(userId, token, expiresAt.toISOString());

      if (result.error) {
        console.error('Failed to store verification token:', result.error);
        throw new Error('Failed to store verification token');
      }

      console.log('✅ Verification token stored successfully');
      return result;

    } catch (error) {
      console.error('❌ Error storing verification token:', error);
      throw error;
    }
  }

  /**
   * Verify email token
   * @param {string} token - Verification token
   * @returns {Object} Verification result
   */
  async verifyEmailToken(token) {
    try {

      // Get email verification token using REST API
      const tokenResult = await databaseOperations.getEmailVerificationToken(token);

      if (tokenResult.error || !tokenResult.data) {
        
        return { valid: false, message: 'Invalid or expired verification token' };
      }

      const tokenData = tokenResult.data;
      const user = tokenData.users || tokenData;
      const userId = user.id || tokenData.user_id;
      const email = user.email;
      const firstName = user.first_name;

      // Mark email as verified using REST API
      console.log('📧 Marking email as verified...');
      const verifyResult = await databaseOperations.markEmailAsVerified(userId);

      if (verifyResult.error) {
        console.error('Failed to mark email as verified:', verifyResult.error);
        return { valid: false, message: 'Failed to verify email' };
      }

      // Delete used token using REST API
      console.log('🗑️ Deleting used verification token...');
      const deleteResult = await databaseOperations.deleteEmailVerificationToken(token);

      if (deleteResult.error) {
        console.error('Failed to delete verification token:', deleteResult.error);
        // Continue anyway - email was verified successfully
      }

      // Send welcome email
      console.log('📬 Sending welcome email...');
      try {
        await this.sendWelcomeEmail(email, firstName);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue anyway - verification was successful
      }

      return {
        valid: true,
        userId: userId,
        email: email,
        firstName: firstName
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return { valid: false, message: 'Email verification failed' };
    }
  }

  /**
   * Get password reset email template
   * @param {string} firstName - User's first name
   * @param {string} resetUrl - Password reset URL
   * @param {number} expiryMinutes - Token expiry time in minutes
   * @returns {string} HTML email template
   */
  getPasswordResetTemplate(firstName, resetUrl, _expiryMinutes = 60) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Floworx Password</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .security-notice { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; border-radius: 0 0 10px 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Password Reset Request</h1>
                <p>Secure Your Hot Tub Business Account</p>
            </div>
            <div class="content">
                <h2>Hi ${firstName || 'there'}!</h2>
                <p>We received a request to reset the password for your Floworx account. If you made this request, click the button below to set a new password:</p>

                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset My Password</a>
                </div>

                <div class="security-notice">
                    <h3>🛡️ Security Notice</h3>
                    <ul>
                        <li>This link will expire in <strong>1 hour</strong> for your security</li>
                        <li>If you didn't request this reset, you can safely ignore this email</li>
                        <li>Your current password will remain unchanged until you create a new one</li>
                    </ul>
                </div>

                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>

                <p>If you didn't request a password reset, please contact our support team immediately at <a href="mailto:support@floworx-iq.com">support@floworx-iq.com</a>.</p>
            </div>
            <div class="footer">
                <p><strong>Floworx</strong> - Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
                <p>This is an automated security email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Get verification email template
   */
  getVerificationEmailTemplate(firstName, verificationUrl) {
    const logoUrl = `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/logo192.png`;
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
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; border-radius: 0 0 10px 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${logoUrl}" alt="FloWorx Logo" class="logo" />
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
    const logoUrl = `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/logo192.png`;
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
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .step { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; border-radius: 0 0 10px 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${logoUrl}" alt="FloWorx Logo" class="logo" />
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

  /**
   * Get password reset email template (enhanced version)
   */
  getPasswordResetTemplateEnhanced(firstName, resetUrl, expiryMinutes) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Floworx</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 10px 10px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset Request</h1>
                <p>Secure access to your Floworx account</p>
            </div>
            <div class="content">
                <h2>Hello ${firstName},</h2>
                <p>We received a request to reset your password for your Floworx account. If you made this request, click the button below to reset your password:</p>

                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset My Password</a>
                </div>

                <div class="warning">
                    <strong>⚠️ Important Security Information:</strong>
                    <ul>
                        <li>This link will expire in ${expiryMinutes} minutes</li>
                        <li>You can only use this link once</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your password will remain unchanged until you complete the reset process</li>
                    </ul>
                </div>

                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">${resetUrl}</p>

                <p>If you didn't request a password reset, you can safely ignore this email. Your account remains secure.</p>

                <p>Best regards,<br>The Floworx Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message from Floworx. Please do not reply to this email.</p>
                <p>If you need help, contact us at <a href="mailto:support@floworx-iq.com">support@floworx-iq.com</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Get password reset confirmation email template
   */
  getPasswordResetConfirmationTemplate(firstName, loginUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful - Floworx</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .security-tips { background: #e8f5e8; border: 1px solid #27ae60; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 10px 10px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Password Reset Successful</h1>
                <p>Your Floworx account is secure</p>
            </div>
            <div class="content">
                <h2>Hello ${firstName},</h2>
                <p>Your password has been successfully reset. You can now log in to your Floworx account with your new password.</p>

                <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Log In to Floworx</a>
                </div>

                <div class="security-tips">
                    <strong>🔒 Security Tips:</strong>
                    <ul>
                        <li>Keep your password secure and don't share it with anyone</li>
                        <li>Use a unique password that you don't use for other accounts</li>
                        <li>Consider enabling two-factor authentication for extra security</li>
                        <li>If you notice any suspicious activity, contact us immediately</li>
                    </ul>
                </div>

                <p>If you didn't reset your password, please contact our support team immediately at <a href="mailto:support@floworx-iq.com">support@floworx-iq.com</a>.</p>

                <p>Best regards,<br>The Floworx Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message from Floworx. Please do not reply to this email.</p>
                <p>If you need help, contact us at <a href="mailto:support@floworx-iq.com">support@floworx-iq.com</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getAccountRecoveryTemplate(firstName, recoveryUrl, recoveryType, expiryTime) {
    const recoveryTypeText = {
      email_change: 'Email Change Recovery',
      account_recovery: 'Account Recovery',
      emergency_access: 'Emergency Access',
      account_lockout: 'Account Lockout Recovery'
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FloWorx Account Recovery</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8fafc;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
            }
            .title {
                font-size: 24px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 10px;
            }
            .recovery-button {
                display: inline-block;
                background: #2563eb;
                color: white;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                text-align: center;
            }
            .warning-box {
                background: #fef3cd;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">FloWorx</div>
                <h1 class="title">${recoveryTypeText[recoveryType] || 'Account Recovery'}</h1>
            </div>

            <p>Hello ${firstName},</p>

            <p>We received a request to recover your FloWorx account. If you made this request, click the button below to continue:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${recoveryUrl}" class="recovery-button">Recover My Account</a>
            </div>

            <div class="warning-box">
                <strong>⚠️ Security Notice:</strong><br>
                If you didn't request this account recovery, please ignore this email. Your account remains secure.
            </div>

            <p><strong>Important:</strong></p>
            <ul>
                <li>This recovery link expires ${expiryTime}</li>
                <li>The link can only be used once</li>
                <li>Never share this recovery link with anyone</li>
            </ul>

            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${recoveryUrl}
            </p>

            <p>If you have any questions, please contact our support team.</p>

            <p>Best regards,<br>The FloWorx Security Team</p>
        </div>
        <div class="footer">
            <p>This email was sent because a recovery request was made for your FloWorx account.</p>
            <p>FloWorx - Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();
