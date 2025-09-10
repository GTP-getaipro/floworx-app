const { google } = require('googleapis');

const { query } = require('../database/unified-connection');
const { decrypt } = require('../utils/encryption');

class GmailService {
  constructor() {
    this.gmail = null;
    this.oauth2Client = null;
  }

  /**
   * Initialize Gmail API client with user credentials
   * @param {string} userId - User ID to fetch credentials for
   */
  async initializeClient(userId) {
    try {
      // Get user credentials from database
      const credQuery = 'SELECT access_token, refresh_token FROM credentials WHERE user_id = $1 AND service_name = $2';
      const credResult = await query(credQuery, [userId, 'google']);

      if (credResult.rows.length === 0) {
        throw new Error('No Google credentials found for user');
      }

      const { access_token, refresh_token } = credResult.rows[0];

      // Decrypt tokens
      const decryptedAccessToken = decrypt(access_token);
      const decryptedRefreshToken = refresh_token ? decrypt(refresh_token) : null;

      // Initialize OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials
      this.oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken
      });

      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      return true;
    } catch (error) {
      console.error('Gmail client initialization error:', error);
      throw error;
    }
  }

  /**
   * Fetch all Gmail labels for the user
   * @param {string} userId - User ID
   * @returns {Array} Array of Gmail labels
   */
  async fetchGmailLabels(userId) {
    try {
      await this.initializeClient(userId);

      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });

      const labels = response.data.labels || [];

      // Filter out system labels and return user-friendly format
      const userLabels = labels
        .filter(label => !label.id.startsWith('CATEGORY_') && !label.id.startsWith('CHAT'))
        .map(label => ({
          id: label.id,
          name: label.name,
          type: label.type,
          messagesTotal: label.messagesTotal || 0,
          messagesUnread: label.messagesUnread || 0
        }));

      return userLabels;
    } catch (error) {
      console.error('Error fetching Gmail labels:', error);
      throw error;
    }
  }

  /**
   * Create a new Gmail label
   * @param {string} userId - User ID
   * @param {string} labelName - Name of the label to create
   * @returns {Object} Created label information
   */
  async createGmailLabel(userId, labelName) {
    try {
      await this.initializeClient(userId);

      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });

      return {
        id: response.data.id,
        name: response.data.name,
        type: response.data.type
      };
    } catch (error) {
      console.error('Error creating Gmail label:', error);
      throw error;
    }
  }

  /**
   * Fetch recent emails from Gmail
   * @param {string} userId - User ID
   * @param {number} maxResults - Maximum number of emails to fetch
   * @returns {Array} Array of email messages
   */
  async fetchRecentEmails(userId, maxResults = 10) {
    try {
      await this.initializeClient(userId);

      // Get list of message IDs
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: 'in:inbox' // Only fetch inbox emails
      });

      if (!listResponse.data.messages) {
        return [];
      }

      // Fetch full message details
      const emails = await Promise.all(
        listResponse.data.messages.map(async message => {
          const messageResponse = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date']
          });

          const headers = messageResponse.data.payload.headers;
          const getHeader = name => headers.find(h => h.name === name)?.value || '';

          return {
            id: message.id,
            threadId: messageResponse.data.threadId,
            from: getHeader('From'),
            to: getHeader('To'),
            subject: getHeader('Subject'),
            date: getHeader('Date'),
            labels: messageResponse.data.labelIds || [],
            snippet: messageResponse.data.snippet
          };
        })
      );

      return emails;
    } catch (error) {
      console.error('Error fetching recent emails:', error);
      throw error;
    }
  }

  /**
   * Apply label to an email message
   * @param {string} userId - User ID
   * @param {string} messageId - Gmail message ID
   * @param {string} labelId - Gmail label ID to apply
   */
  async applyLabelToMessage(userId, messageId, labelId) {
    try {
      await this.initializeClient(userId);

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });

      return true;
    } catch (error) {
      console.error('Error applying label to message:', error);
      throw error;
    }
  }

  /**
   * Send an email reply
   * @param {string} userId - User ID
   * @param {string} threadId - Gmail thread ID
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   */
  async sendReply(userId, threadId, to, subject, body) {
    try {
      await this.initializeClient(userId);

      // Create email message
      const email = [`To: ${to}`, `Subject: ${subject}`, '', body].join('\n');

      // Encode email in base64
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          threadId: threadId,
          raw: encodedEmail
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending email reply:', error);
      throw error;
    }
  }

  /**
   * Get user's Gmail profile information
   * @param {string} userId - User ID
   * @returns {Object} Gmail profile information
   */
  async getGmailProfile(userId) {
    try {
      await this.initializeClient(userId);

      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });

      return {
        emailAddress: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal,
        historyId: response.data.historyId
      };
    } catch (error) {
      console.error('Error fetching Gmail profile:', error);
      throw error;
    }
  }
}

module.exports = new GmailService();
