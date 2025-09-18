/**
 * Gmail Mailbox Service
 * Handles Gmail label discovery and provisioning
 */

const { google } = require('googleapis');
const { query } = require('../../database/unified-connection');
const { decrypt } = require('../../utils/encryption');

class GmailMailboxService {
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
   * Discover existing Gmail labels and parse into taxonomy
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Discovered labels with parsed paths and colors
   */
  async discover(userId) {
    try {
      await this.initializeClient(userId);

      // Get all labels from Gmail
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });

      const labels = response.data.labels || [];

      // Parse labels into structured format
      const discoveredLabels = labels
        .filter(label => label.type === 'user') // Only user-created labels
        .map(label => this.parseLabel(label));

      // Group by hierarchy
      const taxonomy = this.buildTaxonomy(discoveredLabels);

      return {
        provider: 'gmail',
        totalLabels: discoveredLabels.length,
        systemLabels: labels.filter(label => label.type === 'system').length,
        userLabels: discoveredLabels.length,
        labels: discoveredLabels,
        taxonomy: taxonomy,
        discoveredAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Gmail discovery error:', error);
      throw new Error(`Failed to discover Gmail labels: ${error.message}`);
    }
  }

  /**
   * Parse Gmail label into structured format
   * @param {Object} label - Gmail label object
   * @returns {Object} Parsed label with path and color
   */
  parseLabel(label) {
    // Parse nested label names (Gmail uses "/" for nesting)
    const path = label.name.split('/').map(part => part.trim());
    
    // Extract color information if available
    let color = null;
    if (label.color) {
      color = label.color.backgroundColor || label.color.textColor || null;
    }

    return {
      id: label.id,
      name: label.name,
      path: path,
      color: color,
      type: label.type,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      messagesTotal: label.messagesTotal || 0,
      messagesUnread: label.messagesUnread || 0,
      threadsTotal: label.threadsTotal || 0,
      threadsUnread: label.threadsUnread || 0
    };
  }

  /**
   * Build hierarchical taxonomy from flat label list
   * @param {Array} labels - Array of parsed labels
   * @returns {Object} Hierarchical taxonomy structure
   */
  buildTaxonomy(labels) {
    const taxonomy = {};

    labels.forEach(label => {
      let current = taxonomy;
      
      // Build nested structure
      label.path.forEach((segment, index) => {
        if (!current[segment]) {
          current[segment] = {
            name: segment,
            fullPath: label.path.slice(0, index + 1),
            children: {},
            labels: []
          };
        }
        
        // If this is the final segment, add the label
        if (index === label.path.length - 1) {
          current[segment].labels.push(label);
        }
        
        current = current[segment].children;
      });
    });

    return taxonomy;
  }

  /**
   * Provision missing labels in Gmail
   * @param {string} userId - User ID
   * @param {Array} items - Array of items to provision: [{ path: [], color: '#hex' }]
   * @returns {Promise<Object>} Provision results
   */
  async provision(userId, items) {
    try {
      await this.initializeClient(userId);

      const results = {
        created: [],
        skipped: [],
        failed: []
      };

      // Sort items by path depth to create parents first
      const sortedItems = items.sort((a, b) => a.path.length - b.path.length);

      for (const item of sortedItems) {
        try {
          const labelName = item.path.join('/');
          
          // Check if label already exists
          const existingLabel = await this.findLabelByName(labelName);
          
          if (existingLabel) {
            results.skipped.push({
              path: item.path,
              name: labelName,
              id: existingLabel.id,
              reason: 'already_exists'
            });
            continue;
          }

          // Create the label
          const createdLabel = await this.createLabel(labelName, item.color);
          
          results.created.push({
            path: item.path,
            name: labelName,
            id: createdLabel.id,
            color: item.color
          });

        } catch (error) {
          console.error(`Failed to provision label ${item.path.join('/')}:`, error);
          results.failed.push({
            path: item.path,
            name: item.path.join('/'),
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Gmail provision error:', error);
      throw new Error(`Failed to provision Gmail labels: ${error.message}`);
    }
  }

  /**
   * Find Gmail label by name
   * @param {string} labelName - Label name to search for
   * @returns {Promise<Object|null>} Found label or null
   */
  async findLabelByName(labelName) {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });

      const labels = response.data.labels || [];
      return labels.find(label => label.name === labelName) || null;

    } catch (error) {
      console.error('Error finding label by name:', error);
      return null;
    }
  }

  /**
   * Create a new Gmail label
   * @param {string} name - Label name
   * @param {string} color - Hex color code
   * @returns {Promise<Object>} Created label
   */
  async createLabel(name, color = null) {
    try {
      const labelObject = {
        name: name,
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow'
      };

      // Add color if provided
      if (color && this.isValidHexColor(color)) {
        labelObject.color = {
          backgroundColor: color
        };
      }

      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: labelObject
      });

      return response.data;

    } catch (error) {
      console.error('Error creating Gmail label:', error);
      throw error;
    }
  }

  /**
   * Validate hex color format
   * @param {string} color - Color string to validate
   * @returns {boolean} True if valid hex color
   */
  isValidHexColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  /**
   * Get label statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Label statistics
   */
  async getStatistics(userId) {
    try {
      const discovered = await this.discover(userId);
      
      return {
        provider: 'gmail',
        totalLabels: discovered.totalLabels,
        userLabels: discovered.userLabels,
        systemLabels: discovered.systemLabels,
        hierarchyDepth: this.calculateMaxDepth(discovered.taxonomy),
        lastDiscovered: discovered.discoveredAt
      };

    } catch (error) {
      console.error('Error getting Gmail statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate maximum hierarchy depth
   * @param {Object} taxonomy - Taxonomy object
   * @returns {number} Maximum depth
   */
  calculateMaxDepth(taxonomy) {
    let maxDepth = 0;

    function traverse(node, depth = 0) {
      maxDepth = Math.max(maxDepth, depth);
      
      if (node.children) {
        Object.values(node.children).forEach(child => {
          traverse(child, depth + 1);
        });
      }
    }

    Object.values(taxonomy).forEach(node => traverse(node, 1));
    return maxDepth;
  }
}

module.exports = GmailMailboxService;
