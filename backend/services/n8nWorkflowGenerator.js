class N8nWorkflowGenerator {
  constructor() {
    // Simple approach: Use your existing n8n template and replace business-specific values
    this.templateCache = new Map();
  }

  /**
   * Get industry-specific n8n workflow template with business intelligence preservation
   * This includes config fetching, versioned caching, and industry-specific logic
   */
  getWorkingTemplate(industry = 'thtm') {
    const industryKey = `${industry}-enhanced`;

    // Cache the template for performance
    if (this.templateCache.has(industryKey)) {
      return this.templateCache.get(industryKey);
    }

    // Load the industry-specific template from file
    const fs = require('fs');
    const path = require('path');

    try {
      const templatePath = path.join(__dirname, `../templates/${industryKey}-template.json`);
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = JSON.parse(templateContent);

      this.templateCache.set(industryKey, template);
      return template;
    } catch (error) {
      console.error(`Failed to load ${industry} enhanced template, trying fallback:`, error.message);
      return this.getFallbackTemplate(industry);
    }
  }

  /**
   * Get fallback template with hierarchy: industry -> THTM -> enhanced -> basic
   */
  getFallbackTemplate(industry) {
    const fallbackOrder = [
      'thtm-enhanced',
      'enhanced',
      'basic'
    ];

    const fs = require('fs');
    const path = require('path');

    for (const fallback of fallbackOrder) {
      try {
        const templatePath = path.join(__dirname, `../templates/${fallback}-template.json`);
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        const template = JSON.parse(templateContent);

        console.log(`Using fallback template: ${fallback} for industry: ${industry}`);
        return template;
      } catch (error) {
        console.error(`Failed to load ${fallback} template:`, error.message);
        continue;
      }
    }

    // Ultimate fallback to basic template
    return this.getBasicTemplate();
  }

  /**
   * Determine industry from business data
   */
  determineIndustry(businessData) {
    const industry = businessData.industry?.toLowerCase() || '';
    const businessName = businessData.business_name?.toLowerCase() || '';
    const services = (businessData.services || []).join(' ').toLowerCase();

    // Industry mapping based on keywords
    const industryMap = {
      'hvac': ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'heat pump'],
      'electrician': ['electrical', 'electrician', 'wiring', 'panel', 'outlet', 'lighting'],
      'plumber': ['plumbing', 'plumber', 'pipe', 'drain', 'water heater', 'sewer'],
      'drywall': ['drywall', 'ceiling tile', 'sheetrock', 'gypsum', 'taping', 'mudding'],
      'carpenter': ['carpenter', 'carpentry', 'framing', 'trim', 'cabinet', 'millwork'],
      'welder': ['welding', 'welder', 'fabrication', 'structural', 'pipe welding'],
      'roofer': ['roofing', 'roofer', 'shingles', 'roof repair', 'gutters', 'roof replacement'],
      'painter': ['painting', 'painter', 'interior paint', 'exterior paint', 'staining'],
      'insulation': ['insulation', 'blown in', 'spray foam', 'energy efficiency', 'attic'],
      'mason': ['masonry', 'mason', 'brick', 'stone', 'concrete', 'chimney'],
      'pipelayer': ['pipelayer', 'sewer line', 'water main', 'excavation', 'utilities'],
      'locksmith': ['locksmith', 'locks', 'keys', 'security', 'lockout', 'safe']
    };

    // Check for industry matches
    for (const [industryKey, keywords] of Object.entries(industryMap)) {
      const searchText = `${industry} ${businessName} ${services}`;
      if (keywords.some(keyword => searchText.includes(keyword))) {
        return industryKey;
      }
    }

    // Default to THTM (hot tub) if no specific industry detected
    return 'thtm';
  }

  /**
   * Get enhanced n8n workflow template (fallback)
   */
  getEnhancedTemplate() {
    const fs = require('fs');
    const path = require('path');

    try {
      const templatePath = path.join(__dirname, '../templates/enhanced-workflow-template.json');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = JSON.parse(templateContent);

      return template;
    } catch (error) {
      console.error('Failed to load enhanced template, falling back to basic template:', error.message);
      return this.getBasicTemplate();
    }
  }

  /**
   * Basic fallback template (original structure)
   */
  getBasicTemplate() {
    const template = {
      name: "{{COMPANY_NAME}} - Email Automation Workflow",
      nodes: [
        // Gmail Trigger - Your existing structure
        {
          parameters: {
            pollTimes: {
              item: [{ mode: "custom", cronExpression: "=0 */2 * * * *" }]
            },
            simple: false,
            filters: {
              q: "in:inbox -(from:({{BUSINESS_DOMAINS}}))"
            },
            options: { downloadAttachments: true }
          },
          type: "n8n-nodes-base.gmailTrigger",
          typeVersion: 1.2,
          position: [-5904, 3296],
          id: "gmail-trigger-main",
          name: "Gmail Trigger1",
          credentials: {
            gmailOAuth2: {
              id: "{{GMAIL_CREDENTIAL_ID}}",
              name: "{{COMPANY_NAME}} Gmail"
            }
          }
        },
        // AI Classifier - Your existing structure with dynamic system message
        {
          parameters: {
            promptType: "define",
            text: "=Subject: {{ $json.subject }}\\nFrom:{{ $json.from }}\\nTo: {{ $json.to }}\\nDate: {{ $now }}\\nThread ID: {{ $json.threadId }}\\nMessage ID: {{ $json.id }}\\n\\nEmail Body:\\n{{ $json.body }}",
            options: {
              systemMessage: "{{AI_SYSTEM_MESSAGE}}"
            }
          },
          id: "ai-classifier-main",
          name: "AI Master Classifier",
          type: "@n8n/n8n-nodes-langchain.chatOpenAi",
          position: [-4800, 3296],
          typeVersion: 1.3
        }
      ],
      connections: {},
      active: false,
      settings: {},
      versionId: "1.0.0"
    };

    return template;
  }

  /**
   * Minimal fallback template structure
   */
  getMinimalTemplate() {
    return {
      name: "{{COMPANY_NAME}} - Email Automation",
      nodes: [
        {
          parameters: {
            pollTimes: { item: [{ mode: "custom", cronExpression: "=0 */2 * * * *" }] },
            simple: false,
            filters: { q: "in:inbox -(from:({{BUSINESS_DOMAINS}}))" },
            options: { downloadAttachments: true }
          },
          type: "n8n-nodes-base.gmailTrigger",
          typeVersion: 1.2,
          position: [-5904, 3296],
          id: "gmail-trigger-main",
          name: "Gmail Trigger1",
          credentials: { gmailOAuth2: { id: "{{GMAIL_CREDENTIAL_ID}}", name: "{{COMPANY_NAME}} Gmail" } }
        },
        {
          parameters: {
            promptType: "define",
            text: "=Subject: {{ $json.subject }}\\nFrom:{{ $json.from }}\\nTo: {{ $json.to }}\\nDate: {{ $now }}\\nThread ID: {{ $json.threadId }}\\nMessage ID: {{ $json.id }}\\n\\nEmail Body:\\n{{ $json.body }}",
            options: { systemMessage: "{{AI_SYSTEM_MESSAGE}}" }
          },
          id: "ai-classifier-main",
          name: "AI Master Classifier",
          type: "@n8n/n8n-nodes-langchain.chatOpenAi",
          position: [-4800, 3296],
          typeVersion: 1.3
        }
      ],
      connections: {
        "Gmail Trigger1": {
          main: [[{ node: "AI Master Classifier", type: "main", index: 0 }]]
        }
      },
      active: false,
      settings: {},
      versionId: "1.0.0"
    };
  }

  /**
   * Generate personalized n8n workflow based on user's business data
   * @param {Object} businessData - User's business information
   * @param {Object} labelMappings - Gmail label mappings
   * @param {Array} customManagers - Custom manager names (up to 5)
   * @param {Array} customSuppliers - Custom supplier names (up to 10)
   * @param {string} phoneSystem - Phone system type for support
   * @returns {Object} Personalized n8n workflow JSON
   */
  generatePersonalizedWorkflow(businessData, labelMappings, customManagers = [], customSuppliers = [], phoneSystem = 'RingCentral') {
    try {
      // Determine industry from business data
      const industry = this.determineIndustry(businessData);

      // Start with industry-specific workflow template
      const baseTemplate = this.getWorkingTemplate(industry);

      // Create the personalized workflow by replacing business-specific values
      const personalizedWorkflow = JSON.parse(JSON.stringify(baseTemplate));

      // Step 1: Replace basic business information
      this.replaceBusinessInfo(personalizedWorkflow, businessData, phoneSystem);

      // Step 2: Add dynamic switch node with all categories
      this.addCategorySwitchNode(personalizedWorkflow, labelMappings);

      // Step 3: Add standard label nodes (Urgent, Sales, Support, etc.)
      this.addStandardLabelNodes(personalizedWorkflow, businessData);

      // Step 4: Add custom manager nodes
      this.addCustomManagerNodes(personalizedWorkflow, customManagers, businessData);

      // Step 5: Add custom supplier nodes
      this.addCustomSupplierNodes(personalizedWorkflow, customSuppliers, businessData);

      // Step 6: Connect all nodes properly (for basic template)
      if (personalizedWorkflow.versionId === "1.0.0") {
        this.connectWorkflowNodes(personalizedWorkflow, customManagers, customSuppliers);
      }

      // Add metadata
      personalizedWorkflow.meta = {
        instanceId: businessData.user_id,
        companyName: businessData.company_name,
        generatedAt: new Date().toISOString(),
        businessType: businessData.industry || 'hot-tub-spa',
        phoneSystem: phoneSystem,
        customManagers: customManagers.slice(0, 5),
        customSuppliers: customSuppliers.slice(0, 10),
        templateVersion: personalizedWorkflow.versionId || "1.0.0",
        configDriven: personalizedWorkflow.versionId === "2.0.0"
      };

      // Update Gmail credentials placeholder
      personalizedWorkflow.nodes = personalizedWorkflow.nodes.map(node => {
        if (node.credentials && node.credentials.gmailOAuth2) {
          node.credentials.gmailOAuth2 = {
            id: `user_${businessData.user_id}_gmail`,
            name: `${businessData.company_name} Gmail`
          };
        }
        return node;
      });

      // For enhanced templates (v2.0.0 and v3.0.0), add environment variables for config fetching
      if (personalizedWorkflow.versionId === "2.0.0" || personalizedWorkflow.versionId === "3.0.0") {
        personalizedWorkflow.settings = {
          ...personalizedWorkflow.settings,
          env: {
            CLIENT_ID: businessData.user_id,
            FLOWORX_API_URL: process.env.FLOWORX_API_URL || 'https://app.floworx-iq.com',
            FLOWORX_API_CREDENTIAL_ID: `floworx_api_${businessData.user_id}`
          }
        };

        // For THTM enhanced template (v3.0.0), add business intelligence metadata
        if (personalizedWorkflow.versionId === "3.0.0") {
          personalizedWorkflow.meta = {
            ...personalizedWorkflow.meta,
            businessIntelligence: true,
            thtmEnhanced: true,
            configDriven: true,
            preservesOriginalLogic: true,
            emergencyService: customManagers.length > 0,
            serviceTypes: ['installation', 'repair', 'maintenance', 'water_care'],
            supplierDomains: customSuppliers.map(s => s.toLowerCase().replace(/\s+/g, '') + '.com')
          };
        }
      }

      // Update the AI classifier system message with business-specific data
      const aiClassifierNode = personalizedWorkflow.nodes.find(node => 
        node.name === 'AI Master Classifier'
      );

      if (aiClassifierNode) {
        aiClassifierNode.parameters.options.systemMessage = this.generatePersonalizedSystemMessage(
          businessData, 
          customManagers, 
          customSuppliers, 
          phoneSystem
        );
      }

      // Update Gmail trigger filter to exclude business emails
      const gmailTriggerNode = personalizedWorkflow.nodes.find(node => 
        node.name === 'Gmail Trigger1'
      );

      if (gmailTriggerNode) {
        const businessDomains = this.extractBusinessDomains(businessData);
        gmailTriggerNode.parameters.filters.q = `in:inbox -(from:(${businessDomains.join(' OR ')}))`;
      }

      // The new methods already handle all node creation, so we don't need the old ones

      // Update label IDs with actual Gmail label IDs if available
      if (labelMappings && labelMappings.length > 0) {
        this.updateLabelIds(personalizedWorkflow, labelMappings);
      }

      return personalizedWorkflow;

    } catch (error) {
      console.error('Error generating personalized n8n workflow:', error);
      throw error;
    }
  }

  /**
   * Replace business information in the workflow template
   * This is where we swap hardcoded values with actual business data
   */
  replaceBusinessInfo(workflow, businessData, phoneSystem) {
    // Replace workflow name
    workflow.name = `${businessData.company_name} - Email Automation Workflow`;

    // Find and update Gmail nodes with business-specific credentials
    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.gmailTrigger' || node.type === 'n8n-nodes-base.gmail') {
        // Update credential ID
        if (node.credentials && node.credentials.gmailOAuth2) {
          node.credentials.gmailOAuth2.id = `user_${businessData.user_id}_gmail`;
          node.credentials.gmailOAuth2.name = `${businessData.company_name} Gmail`;
        }

        // Update Gmail filter to exclude business domains
        if (node.parameters && node.parameters.filters) {
          const businessDomains = this.extractBusinessDomains(businessData);
          node.parameters.filters.q = `in:inbox -(from:(${businessDomains.join(' OR ')}))`;
        }
      }

      // Update AI classifier with personalized system message
      if (node.type === '@n8n/n8n-nodes-langchain.chatOpenAi') {
        node.parameters.options.systemMessage = this.generatePersonalizedSystemMessage(
          businessData, [], [], phoneSystem
        );
      }
    });
  }

  /**
   * Add the main category switch node - this is the heart of your workflow
   */
  addCategorySwitchNode(workflow, _labelMappings) {
    const switchNode = {
      parameters: {
        rules: {
          values: [
            // Urgent category
            {
              conditions: {
                options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
                conditions: [{
                  leftValue: "={{ $json.parsed_output.primary_category }}",
                  rightValue: "Urgent",
                  operator: { type: "string", operation: "equals" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "Urgent"
            },
            // Sales category
            {
              conditions: {
                options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
                conditions: [{
                  leftValue: "={{ $json.parsed_output.primary_category }}",
                  rightValue: "Sales",
                  operator: { type: "string", operation: "equals" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "Sales"
            },
            // Support category
            {
              conditions: {
                options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
                conditions: [{
                  leftValue: "={{ $json.parsed_output.primary_category }}",
                  rightValue: "Support",
                  operator: { type: "string", operation: "equals" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "Support"
            }
          ]
        },
        options: {}
      },
      type: "n8n-nodes-base.switch",
      typeVersion: 3.2,
      position: [-3856, 2880],
      id: "main-switch",
      name: "Category Switch"
    };

    workflow.nodes.push(switchNode);
  }

  /**
   * Add standard label nodes (Urgent, Sales, Support, Banking, etc.)
   * These are the core categories that work for any service business
   */
  addStandardLabelNodes(workflow, businessData) {
    const standardLabels = [
      { name: 'Urgent', labelId: 'Label_Urgent', position: [-1552, 500] },
      { name: 'Sales', labelId: 'Label_Sales', position: [-1552, 692] },
      { name: 'Support', labelId: 'Label_Support', position: [-1552, 884] },
      { name: 'Banking', labelId: 'Label_Banking', position: [-1552, 1076] },
      { name: 'Manager', labelId: 'Label_Manager', position: [-1552, 1268] },
      { name: 'Suppliers', labelId: 'Label_Suppliers', position: [-1552, 1460] },
      { name: 'FormSub', labelId: 'Label_FormSub', position: [-1552, 1652] },
      { name: 'Phone', labelId: 'Label_Phone', position: [-1552, 1844] },
      { name: 'Misc', labelId: 'Label_Misc', position: [-1552, 2036] }
    ];

    standardLabels.forEach(label => {
      const labelNode = {
        parameters: {
          operation: "addLabels",
          messageId: "={{ $json.parsed_output.id }}",
          labelIds: [label.labelId]
        },
        type: "n8n-nodes-base.gmail",
        typeVersion: 2.1,
        position: label.position,
        id: `label-${label.name.toLowerCase()}`,
        name: label.name,
        credentials: {
          gmailOAuth2: {
            id: `user_${businessData.user_id}_gmail`,
            name: `${businessData.company_name} Gmail`
          }
        }
      };

      workflow.nodes.push(labelNode);
    });
  }

  /**
   * Add custom manager nodes - this is where your template becomes dynamic
   */
  addCustomManagerNodes(workflow, customManagers, businessData) {
    const limitedManagers = customManagers.slice(0, 5); // Max 5 managers

    limitedManagers.forEach((manager, index) => {
      const managerNode = {
        parameters: {
          operation: "addLabels",
          messageId: "={{ $json.parsed_output.id }}",
          labelIds: [`Label_Manager_${manager.replace(/\s+/g, '')}`]
        },
        type: "n8n-nodes-base.gmail",
        typeVersion: 2.1,
        position: [-1040, 2896 + (index * 192)],
        id: `manager-${index}`,
        name: manager,
        credentials: {
          gmailOAuth2: {
            id: `user_${businessData.user_id}_gmail`,
            name: `${businessData.company_name} Gmail`
          }
        }
      };

      workflow.nodes.push(managerNode);
    });
  }

  /**
   * Add custom supplier nodes - dynamic supplier handling
   */
  addCustomSupplierNodes(workflow, customSuppliers, businessData) {
    const limitedSuppliers = customSuppliers.slice(0, 10); // Max 10 suppliers

    limitedSuppliers.forEach((supplier, index) => {
      const supplierNode = {
        parameters: {
          operation: "addLabels",
          messageId: "={{ $json.parsed_output.id }}",
          labelIds: [`Label_Supplier_${supplier.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}`]
        },
        type: "n8n-nodes-base.gmail",
        typeVersion: 2.1,
        position: [-528, 2896 + (index * 192)],
        id: `supplier-${index}`,
        name: supplier.length > 20 ? supplier.substring(0, 20) + '...' : supplier,
        credentials: {
          gmailOAuth2: {
            id: `user_${businessData.user_id}_gmail`,
            name: `${businessData.company_name} Gmail`
          }
        }
      };

      workflow.nodes.push(supplierNode);
    });
  }

  /**
   * Connect all workflow nodes - this creates the email routing logic
   */
  connectWorkflowNodes(workflow, customManagers, customSuppliers) {
    // Initialize connections object
    workflow.connections = {
      "Gmail Trigger1": {
        main: [[{ node: "AI Master Classifier", type: "main", index: 0 }]]
      },
      "AI Master Classifier": {
        main: [[{ node: "Category Switch", type: "main", index: 0 }]]
      },
      "Category Switch": {
        main: [
          // Standard category outputs
          [{ node: "Urgent", type: "main", index: 0 }],
          [{ node: "Sales", type: "main", index: 0 }],
          [{ node: "Support", type: "main", index: 0 }],
          [{ node: "Banking", type: "main", index: 0 }],
          [{ node: "Manager", type: "main", index: 0 }],
          [{ node: "Suppliers", type: "main", index: 0 }],
          [{ node: "FormSub", type: "main", index: 0 }],
          [{ node: "Phone", type: "main", index: 0 }],
          [{ node: "Misc", type: "main", index: 0 }]
        ]
      }
    };

    // Add connections for custom managers
    if (customManagers.length > 0) {
      workflow.connections["Manager"] = {
        main: customManagers.slice(0, 5).map((manager, _index) => [
          { node: manager, type: "main", index: 0 }
        ])
      };
    }

    // Add connections for custom suppliers
    if (customSuppliers.length > 0) {
      workflow.connections["Suppliers"] = {
        main: customSuppliers.slice(0, 10).map((supplier, _index) => [
          { node: supplier.length > 20 ? supplier.substring(0, 20) + '...' : supplier, type: "main", index: 0 }
        ])
      };
    }
  }

  /**
   * Generate personalized system message for AI classifier
   * This is the key to making your template work for any business
   */
  generatePersonalizedSystemMessage(businessData, customManagers, customSuppliers, phoneSystem) {
    // Get industry-specific context
    const industryType = businessData.industry || 'service-business';
    const businessType = this.getBusinessTypeDescription(industryType);

    let baseMessage = `You are an expert email processing and routing system for "${businessData.company_name}", a ${businessType}.

Your SOLE task is to analyze the provided email and return a single, structured JSON object containing a summary, precise classifications, and extracted entities. Follow all rules precisely.

### Business Information:
- Company: ${businessData.company_name}
- Phone: ${businessData.business_phone}
- Service Area: ${businessData.service_area_radius || 'Local area'} ${businessData.service_area_radius ? 'miles' : ''}
- Services: ${businessData.primary_services ? businessData.primary_services.join(', ') : this.getDefaultServices(industryType)}
- Response Time Goal: ${this.formatResponseTime(businessData.response_time_goal) || 'Within 24 hours'}
- Business Hours: ${businessData.business_hours || 'Mon-Fri 8AM-6PM'}
- Phone System: ${phoneSystem}
${businessData.emergency_phone ? `- Emergency Phone: ${businessData.emergency_phone}` : ''}

### Custom Team Members:`;

    // Add custom managers
    if (customManagers.length > 0) {
      customManagers.forEach(manager => {
        baseMessage += `\n- Manager: ${manager}`;
      });
    }

    // Add custom suppliers
    if (customSuppliers.length > 0) {
      baseMessage += '\n\n### Custom Suppliers:';
      customSuppliers.forEach(supplier => {
        baseMessage += `\n- ${supplier}`;
      });
    }

    // Add phone system specific instructions
    baseMessage += `\n\n### Phone System Integration:
Phone category applies to emails from ${phoneSystem.toLowerCase()} notifications including:
- Voicemail transcripts
- Missed call alerts  
- SMS/text message notifications
- Call recordings
${phoneSystem === 'RingCentral' ? '- Emails from service@ringcentral.com' : '- Phone system notifications'}

### Rules:
If the email is from an external sender, and primary_category is Support or Sales, and confidence is at least 0.75, always set "ai_can_reply": true—including for Support > General complaints, unless the sender is internal or the message is abusive/illegal.

If the sender's email address contains your business domain, always set: "ai_can_reply": false

[Rest of classification rules follow the standard hot tub business template...]`;

    return baseMessage;
  }

  /**
   * Get business type description based on industry
   */
  getBusinessTypeDescription(industryType) {
    const descriptions = {
      'hot-tub-spa': 'hot tub and spa service business',
      'hvac': 'HVAC service business',
      'plumbing': 'plumbing service business',
      'landscaping': 'landscaping service business',
      'service-business': 'service business'
    };

    return descriptions[industryType] || 'service business';
  }

  /**
   * Get default services for industry type
   */
  getDefaultServices(industryType) {
    const defaultServices = {
      'hot-tub-spa': 'Hot tub installation, repair, maintenance, water care',
      'hvac': 'Heating, cooling, HVAC installation and repair',
      'plumbing': 'Plumbing repair, installation, drain cleaning',
      'landscaping': 'Lawn care, landscaping, tree service, irrigation',
      'service-business': 'Professional services'
    };

    return defaultServices[industryType] || 'Professional services';
  }

  /**
   * Format response time for display
   * @param {string} responseTime - Response time code
   * @returns {string} Formatted response time
   */
  formatResponseTime(responseTime) {
    const timeMap = {
      '1_hour': 'Within 1 hour',
      '4_hours': 'Within 4 hours',
      '24_hours': 'Within 24 hours',
      '48_hours': 'Within 48 hours'
    };

    return timeMap[responseTime] || responseTime;
  }

  /**
   * Extract business domains for email filtering
   */
  extractBusinessDomains(businessData) {
    const domains = [];
    
    // Extract domain from business email if available
    if (businessData.business_email) {
      const domain = businessData.business_email.split('@')[1];
      if (domain) {
        domains.push(`*@${domain}`);
      }
    }

    // Add common business domain patterns
    const companyName = businessData.company_name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    domains.push(`*@${companyName}.ca`);
    domains.push(`*@${companyName}.com`);

    return domains;
  }

  /**
   * Generate standard label nodes for hot tub business
   */
  generateStandardLabelNodes(businessData) {
    const standardCategories = [
      { name: 'Urgent', position: [-1552, 500], labelId: 'Label_Urgent' },
      { name: 'Sales', position: [-1552, 692], labelId: 'Label_Sales' },
      { name: 'Support', position: [-1552, 884], labelId: 'Label_Support' },
      { name: 'Banking', position: [-928, 500], labelId: 'Label_Banking' },
      { name: 'FormSub', position: [-928, 692], labelId: 'Label_FormSub' },
      { name: 'Recruitment', position: [-1552, 1076], labelId: 'Label_Recruitment' },
      { name: 'Promo', position: [-1552, 1268], labelId: 'Label_Promo' },
      { name: 'Social Media', position: [-1552, 1460], labelId: 'Label_SocialMedia' },
      { name: 'Google Reviews', position: [-928, 884], labelId: 'Label_GoogleReviews' },
      { name: 'Phone', position: [-928, 1076], labelId: 'Label_Phone' },
      { name: 'Misc', position: [-1552, 1652], labelId: 'Label_Misc' }
    ];

    return standardCategories.map((category, index) => ({
      parameters: {
        operation: "addLabels",
        messageId: "={{ $json.parsed_output.id }}",
        labelIds: [category.labelId]
      },
      type: "n8n-nodes-base.gmail",
      typeVersion: 2.1,
      position: category.position,
      id: `standard-${category.name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      name: category.name,
      webhookId: `${category.name.toLowerCase().replace(/\s+/g, '-')}-webhook`,
      credentials: {
        gmailOAuth2: {
          id: `user_${businessData.user_id}_gmail`,
          name: `${businessData.company_name} Gmail`
        }
      }
    }));
  }

  /**
   * Generate custom manager nodes
   */
  generateCustomManagerNodes(customManagers, businessData) {
    const nodes = [];
    const yPosition = 2896; // Starting position from template

    customManagers.forEach((managerName, index) => {
      const nodeId = `custom-manager-${index + 1}`;
      const labelId = `Label_Manager_${managerName.replace(/\s+/g, '')}`;

      nodes.push({
        parameters: {
          operation: "addLabels",
          messageId: "={{ $json.parsed_output.id }}",
          labelIds: [labelId]
        },
        type: "n8n-nodes-base.gmail",
        typeVersion: 2.1,
        position: [-1040, yPosition + (index * 192)],
        id: nodeId,
        name: managerName,
        webhookId: `manager-${index + 1}-webhook`,
        credentials: {
          gmailOAuth2: {
            id: `user_${businessData.user_id}_gmail`,
            name: `${businessData.company_name} Gmail`
          }
        }
      });
    });

    return nodes;
  }

  /**
   * Generate custom supplier nodes
   */
  generateCustomSupplierNodes(customSuppliers, businessData) {
    const nodes = [];
    const yPosition = 4048; // Starting position from template

    customSuppliers.forEach((supplierName, index) => {
      const nodeId = `custom-supplier-${index + 1}`;
      const labelId = `Label_Supplier_${supplierName.replace(/[^a-zA-Z0-9]/g, '')}`;

      nodes.push({
        parameters: {
          operation: "addLabels",
          messageId: "={{ $json.parsed_output.id }}",
          labelIds: [labelId]
        },
        type: "n8n-nodes-base.gmail",
        typeVersion: 2.1,
        position: [-1040, yPosition + (index * 192)],
        id: nodeId,
        name: supplierName,
        webhookId: `supplier-${index + 1}-webhook`,
        credentials: {
          gmailOAuth2: {
            id: `user_${businessData.user_id}_gmail`,
            name: `${businessData.company_name} Gmail`
          }
        }
      });
    });

    return nodes;
  }

  /**
   * Update switch node with all categories (standard + custom)
   */
  updateSwitchNodeWithAllCategories(switchNode, customManagers, customSuppliers) {
    // Clear existing rules
    switchNode.parameters.rules.values = [];

    // Add standard category rules
    const standardCategories = [
      'Urgent', 'Sales', 'Support', 'Banking', 'FormSub',
      'Recruitment', 'Promo', 'Socialmedia', 'GoogleReview', 'Phone', 'Misc'
    ];

    standardCategories.forEach(category => {
      switchNode.parameters.rules.values.push({
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2
          },
          conditions: [{
            leftValue: "={{ $json.parsed_output.primary_category }}",
            rightValue: category,
            operator: {
              type: "string",
              operation: "equals"
            }
          }],
          combinator: "and"
        },
        renameOutput: true,
        outputKey: category
      });
    });
    // Add custom manager conditions
    customManagers.forEach(managerName => {
      switchNode.parameters.rules.values.push({
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2
          },
          conditions: [{
            leftValue: "={{ $json.parsed_output.secondary_category }}",
            rightValue: managerName,
            operator: {
              type: "string",
              operation: "equals"
            }
          }],
          combinator: "and"
        },
        renameOutput: true,
        outputKey: managerName
      });
    });

    // Add custom supplier conditions
    customSuppliers.forEach(supplierName => {
      const supplierKey = supplierName.replace(/[^a-zA-Z0-9]/g, '');
      switchNode.parameters.rules.values.push({
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2
          },
          conditions: [{
            leftValue: "={{ $json.parsed_output.secondary_category }}",
            rightValue: supplierKey,
            operator: {
              type: "string",
              operation: "equals"
            }
          }],
          combinator: "and"
        },
        renameOutput: true,
        outputKey: supplierKey
      });
    });
  }

  /**
   * Update label IDs with actual Gmail labels
   */
  updateLabelIds(workflow, labelMappings) {
    const labelMap = {};
    labelMappings.forEach(mapping => {
      labelMap[mapping.standardLabelKey] = mapping.gmailLabelId;
    });

    workflow.nodes.forEach(node => {
      if (node.parameters && node.parameters.labelIds) {
        node.parameters.labelIds = node.parameters.labelIds.map(labelId => {
          // Find matching standard label
          const standardKey = Object.keys(labelMap).find(key => 
            labelId.includes(key) || node.name.toLowerCase().includes(key)
          );
          return standardKey ? labelMap[standardKey] : labelId;
        });
      }
    });
  }
}

module.exports = N8nWorkflowGenerator;
