const axios = require('axios');

const { pool } = require('../database/connection');

const _transactionService = require('./transactionService');

class N8nService {
  constructor() {
    this.baseURL = process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
    this.apiKey = process.env.N8N_API_KEY;
    this.webhookBaseURL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      config => {
        console.log(`N8N API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        console.error('N8N API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      response => {
        console.log(`N8N API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        console.error('N8N API Response Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test n8n API connection
   * @returns {Object} Connection status
   */
  async testConnection() {
    try {
      const response = await this.client.get('/workflows');
      return {
        connected: true,
        status: 'healthy',
        workflowCount: response.data.data?.length || 0,
        version: response.headers['x-n8n-version'] || 'unknown'
      };
    } catch (error) {
      return {
        connected: false,
        status: 'error',
        error: error.message,
        code: error.response?.status
      };
    }
  }

  /**
   * Create a new workflow from template
   * @param {string} userId - User ID
   * @param {Object} config - User's onboarding configuration
   * @returns {Object} Created workflow information
   */
  async createWorkflowFromTemplate(userId, config) {
    try {
      // Get the master template
      const template = await this.getMasterTemplate();

      // Customize template with user configuration
      const customizedWorkflow = await this.customizeWorkflow(template, userId, config);

      // Create workflow in n8n
      const response = await this.client.post('/workflows', customizedWorkflow);

      const workflowData = response.data.data;

      // Store workflow deployment record
      await this.storeWorkflowDeployment(userId, workflowData, config);

      return {
        success: true,
        workflowId: workflowData.id,
        workflowName: workflowData.name,
        webhookUrl: this.generateWebhookUrl(workflowData.id),
        status: 'created'
      };
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }

  /**
   * Activate a workflow
   * @param {string} workflowId - n8n workflow ID
   * @returns {Object} Activation result
   */
  async activateWorkflow(workflowId) {
    try {
      const _response = await this.client.post(`/workflows/${workflowId}/activate`);

      return {
        success: true,
        workflowId,
        status: 'active',
        activatedAt: new Date()
      };
    } catch (error) {
      console.error('Error activating workflow:', error);
      throw new Error(`Failed to activate workflow: ${error.message}`);
    }
  }

  /**
   * Deactivate a workflow
   * @param {string} workflowId - n8n workflow ID
   * @returns {Object} Deactivation result
   */
  async deactivateWorkflow(workflowId) {
    try {
      const _response = await this.client.post(`/workflows/${workflowId}/deactivate`);

      return {
        success: true,
        workflowId,
        status: 'inactive',
        deactivatedAt: new Date()
      };
    } catch (error) {
      console.error('Error deactivating workflow:', error);
      throw new Error(`Failed to deactivate workflow: ${error.message}`);
    }
  }

  /**
   * Test workflow execution
   * @param {string} workflowId - n8n workflow ID
   * @param {Object} testData - Test data to send
   * @returns {Object} Test execution result
   */
  async testWorkflow(workflowId, testData = {}) {
    try {
      const response = await this.client.post(`/workflows/${workflowId}/execute`, {
        data: testData
      });

      return {
        success: true,
        executionId: response.data.data.executionId,
        status: response.data.data.status,
        result: response.data.data
      };
    } catch (error) {
      console.error('Error testing workflow:', error);
      throw new Error(`Failed to test workflow: ${error.message}`);
    }
  }

  /**
   * Get workflow execution status
   * @param {string} executionId - Execution ID
   * @returns {Object} Execution status
   */
  async getExecutionStatus(executionId) {
    try {
      const response = await this.client.get(`/executions/${executionId}`);

      return {
        success: true,
        execution: response.data.data
      };
    } catch (error) {
      console.error('Error getting execution status:', error);
      throw new Error(`Failed to get execution status: ${error.message}`);
    }
  }

  /**
   * Delete a workflow
   * @param {string} workflowId - n8n workflow ID
   * @returns {Object} Deletion result
   */
  async deleteWorkflow(workflowId) {
    try {
      await this.client.delete(`/workflows/${workflowId}`);

      return {
        success: true,
        workflowId,
        status: 'deleted',
        deletedAt: new Date()
      };
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }
  }

  /**
   * Get master workflow template
   * @returns {Object} Master template
   */
  getMasterTemplate() {
    // This would typically load from a file or database
    // For now, return a basic email automation template
    return {
      name: 'Floworx Email Automation Template',
      nodes: [
        {
          parameters: {},
          name: 'Gmail Trigger',
          type: 'n8n-nodes-base.gmailTrigger',
          typeVersion: 1,
          position: [250, 300],
          webhookId: 'gmail-webhook',
          credentials: {
            gmailOAuth2: 'gmail_oauth'
          }
        },
        {
          parameters: {
            functionCode:
              "// Email categorization logic\nconst email = items[0].json;\nconst subject = email.subject || '';\nconst body = email.body || '';\nconst from = email.from || '';\n\n// Simple categorization rules\nlet category = 'general';\n\nif (subject.toLowerCase().includes('quote') || subject.toLowerCase().includes('price')) {\n  category = 'new-leads';\n} else if (subject.toLowerCase().includes('support') || subject.toLowerCase().includes('help')) {\n  category = 'customer-support';\n} else if (subject.toLowerCase().includes('service') || subject.toLowerCase().includes('repair')) {\n  category = 'service-requests';\n} else if (subject.toLowerCase().includes('invoice') || subject.toLowerCase().includes('payment')) {\n  category = 'invoices-billing';\n}\n\nreturn [{\n  json: {\n    ...email,\n    category,\n    processed_at: new Date().toISOString()\n  }\n}];"
          },
          name: 'Categorize Email',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            conditions: {
              string: [
                {
                  value1: '={{$json.category}}',
                  operation: 'equal',
                  value2: 'new-leads'
                }
              ]
            }
          },
          name: 'Is New Lead?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            labelIds: ['INBOX', 'Label_New_Leads'],
            messageId: '={{$json.id}}'
          },
          name: 'Label as New Lead',
          type: 'n8n-nodes-base.gmail',
          typeVersion: 1,
          position: [850, 200],
          credentials: {
            gmailOAuth2: 'gmail_oauth'
          }
        },
        {
          parameters: {
            to: 'team@company.com',
            subject: 'New Lead: {{$json.subject}}',
            message:
              'A new lead email has been received:\n\nFrom: {{$json.from}}\nSubject: {{$json.subject}}\n\nPlease review and respond promptly.'
          },
          name: 'Notify Team',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 1,
          position: [1050, 200]
        }
      ],
      connections: {
        'Gmail Trigger': {
          main: [
            [
              {
                node: 'Categorize Email',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Categorize Email': {
          main: [
            [
              {
                node: 'Is New Lead?',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Is New Lead?': {
          main: [
            [
              {
                node: 'Label as New Lead',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Label as New Lead': {
          main: [
            [
              {
                node: 'Notify Team',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      active: false,
      settings: {},
      staticData: {}
    };
  }

  /**
   * Customize workflow template with user configuration
   * @param {Object} template - Base template
   * @param {string} userId - User ID
   * @param {Object} config - User configuration
   * @returns {Object} Customized workflow
   */
  customizeWorkflow(template, userId, config) {
    const customized = JSON.parse(JSON.stringify(template)); // Deep clone

    // Customize workflow name
    customized.name = `Floworx Automation - User ${userId}`;

    // Update categorization logic based on user's categories
    if (config.businessCategories && config.businessCategories.length > 0) {
      const categorizeNode = customized.nodes.find(n => n.name === 'Categorize Email');
      if (categorizeNode) {
        categorizeNode.parameters.functionCode = this.generateCategorizationCode(config.businessCategories);
      }
    }

    // Update Gmail labels based on user's mappings
    if (config.labelMappings && config.labelMappings.length > 0) {
      // This would update the label assignment logic
      // For now, we'll keep it simple
    }

    // Update team notifications
    if (config.teamMembers && config.teamMembers.length > 0) {
      const notifyNode = customized.nodes.find(n => n.name === 'Notify Team');
      if (notifyNode) {
        const teamEmails = config.teamMembers.map(m => m.email).join(', ');
        notifyNode.parameters.to = teamEmails;
      }
    }

    return customized;
  }

  /**
   * Generate categorization code based on user's categories
   * @param {Array} categories - User's business categories
   * @returns {string} JavaScript code for categorization
   */
  generateCategorizationCode(categories) {
    const categoryRules = categories
      .map(cat => {
        const keywords = this.generateKeywords(cat.name);
        return `if (${keywords.map(k => `subject.toLowerCase().includes('${k}') || body.toLowerCase().includes('${k}')`).join(' || ')}) {
  category = '${cat.name.toLowerCase().replace(/\s+/g, '-')}';
}`;
      })
      .join(' else ');

    return `// AI-powered email categorization
const email = items[0].json;
const subject = email.subject || '';
const body = email.body || '';
const from = email.from || '';

// Default category
let category = 'general';

// User-defined categorization rules
${categoryRules}

return [{
  json: {
    ...email,
    category,
    processed_at: new Date().toISOString(),
    confidence: 0.8 // Placeholder for AI confidence score
  }
}];`;
  }

  /**
   * Generate keywords for a category
   * @param {string} categoryName - Category name
   * @returns {Array} Keywords for matching
   */
  generateKeywords(categoryName) {
    const keywordMap = {
      'new leads': ['quote', 'price', 'cost', 'interested', 'inquiry', 'information'],
      'customer support': ['help', 'support', 'problem', 'issue', 'trouble', 'question'],
      'service requests': ['service', 'repair', 'maintenance', 'fix', 'broken', 'appointment'],
      'invoices & billing': ['invoice', 'payment', 'bill', 'charge', 'receipt', 'refund'],
      partnerships: ['partner', 'vendor', 'supplier', 'collaboration', 'business'],
      appointments: ['appointment', 'schedule', 'booking', 'meeting', 'visit'],
      'product inquiries': ['product', 'hot tub', 'spa', 'model', 'features', 'specifications'],
      'warranty claims': ['warranty', 'claim', 'defect', 'replacement', 'coverage']
    };

    const key = categoryName.toLowerCase();
    return keywordMap[key] || [key.replace(/\s+/g, ''), key.split(' ')[0]];
  }

  /**
   * Store workflow deployment record
   * @param {string} userId - User ID
   * @param {Object} workflowData - n8n workflow data
   * @param {Object} config - User configuration
   */
  async storeWorkflowDeployment(userId, workflowData, config) {
    const query = `
      INSERT INTO workflow_deployments (
        user_id, n8n_workflow_id, workflow_name, workflow_status, deployment_config, deployed_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        n8n_workflow_id = EXCLUDED.n8n_workflow_id,
        workflow_name = EXCLUDED.workflow_name,
        workflow_status = EXCLUDED.workflow_status,
        deployment_config = EXCLUDED.deployment_config,
        deployed_at = EXCLUDED.deployed_at,
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.query(query, [
      userId,
      workflowData.id.toString(),
      workflowData.name,
      'deployed',
      JSON.stringify(config),
      new Date()
    ]);
  }

  /**
   * Generate webhook URL for workflow
   * @param {string} workflowId - n8n workflow ID
   * @returns {string} Webhook URL
   */
  generateWebhookUrl(workflowId) {
    return `${this.webhookBaseURL}/floworx-${workflowId}`;
  }

  /**
   * Get user's deployed workflows
   * @param {string} userId - User ID
   * @returns {Array} User's workflows
   */
  async getUserWorkflows(userId) {
    const query = `
      SELECT n8n_workflow_id, workflow_name, workflow_status, deployed_at, deployment_config
      FROM workflow_deployments
      WHERE user_id = $1
      ORDER BY deployed_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Validate workflow configuration before deployment
   * @param {Object} config - User configuration
   * @returns {Object} Validation result
   */
  validateWorkflowConfig(config) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!config.businessCategories || config.businessCategories.length === 0) {
      errors.push('At least one business category is required');
    }

    // Validate categories
    if (config.businessCategories) {
      config.businessCategories.forEach((category, index) => {
        if (!category.name || category.name.trim().length === 0) {
          errors.push(`Category ${index + 1} must have a name`);
        }
        if (category.name && category.name.length > 50) {
          warnings.push(`Category "${category.name}" is quite long - consider shortening for better readability`);
        }
      });
    }

    // Check team members
    if (config.teamMembers && config.teamMembers.length > 10) {
      warnings.push('Large number of team members may result in many notifications');
    }

    // Validate email addresses
    if (config.teamMembers) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      config.teamMembers.forEach((member, index) => {
        if (member.email && !emailRegex.test(member.email)) {
          errors.push(`Team member ${index + 1} has invalid email address: ${member.email}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateConfigScore(config)
    };
  }

  /**
   * Calculate configuration quality score
   * @param {Object} config - User configuration
   * @returns {number} Score from 0-100
   */
  calculateConfigScore(config) {
    let score = 0;

    // Base score for having categories
    if (config.businessCategories && config.businessCategories.length > 0) {
      score += 40;

      // Bonus for multiple categories
      if (config.businessCategories.length >= 3) {
        score += 10;
      }
      if (config.businessCategories.length >= 5) {
        score += 10;
      }
    }

    // Score for label mappings
    if (config.labelMappings && config.labelMappings.length > 0) {
      score += 20;
    }

    // Score for team setup
    if (config.teamMembers && config.teamMembers.length > 0) {
      score += 20;

      // Bonus for multiple team members
      if (config.teamMembers.length >= 2) {
        score += 5;
      }
      if (config.teamMembers.length >= 3) {
        score += 5;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Get workflow performance metrics
   * @param {string} workflowId - n8n workflow ID
   * @returns {Object} Performance metrics
   */
  async getWorkflowMetrics(workflowId) {
    try {
      // Get recent executions
      const response = await this.client.get(`/executions?workflowId=${workflowId}&limit=100`);
      const executions = response.data.data || [];

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recent24h = executions.filter(e => new Date(e.startedAt) > last24Hours);
      const recent7d = executions.filter(e => new Date(e.startedAt) > last7Days);

      const successful = executions.filter(e => e.finished && !e.stoppedAt);
      const failed = executions.filter(e => e.stoppedAt);

      return {
        total: executions.length,
        successful: successful.length,
        failed: failed.length,
        successRate: executions.length > 0 ? (successful.length / executions.length) * 100 : 0,
        last24Hours: recent24h.length,
        last7Days: recent7d.length,
        averageExecutionTime: this.calculateAverageExecutionTime(successful),
        lastExecution: executions.length > 0 ? executions[0].startedAt : null
      };
    } catch (error) {
      console.error('Error getting workflow metrics:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        last24Hours: 0,
        last7Days: 0,
        averageExecutionTime: 0,
        lastExecution: null,
        error: error.message
      };
    }
  }

  /**
   * Calculate average execution time
   * @param {Array} executions - Successful executions
   * @returns {number} Average time in milliseconds
   */
  calculateAverageExecutionTime(executions) {
    if (executions.length === 0) {
      return 0;
    }

    const totalTime = executions.reduce((sum, execution) => {
      const start = new Date(execution.startedAt);
      const end = new Date(execution.finishedAt);
      return sum + (end - start);
    }, 0);

    return Math.round(totalTime / executions.length);
  }
}

module.exports = new N8nService();

module.exports = new N8nService();
