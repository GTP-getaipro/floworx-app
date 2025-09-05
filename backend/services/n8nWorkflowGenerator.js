class N8nWorkflowGenerator {
  constructor() {
    // Internal template structure - not exposed as external file
    this.baseTemplate = this.getSecureBaseTemplate();
  }

  /**
   * Get the secure base template structure (internal only)
   * @returns {Object} Base n8n workflow template
   */
  getSecureBaseTemplate() {
    return {
      name: "Hot Tub Business Email Automation",
      nodes: [
        {
          parameters: {
            pollTimes: {
              item: [
                {
                  mode: "custom",
                  cronExpression: "=0 */2 * * * *"
                }
              ]
            },
            simple: false,
            filters: {
              q: "in:inbox -(from:(*@business.com))"
            },
            options: {
              downloadAttachments: true
            }
          },
          type: "n8n-nodes-base.gmailTrigger",
          typeVersion: 1.2,
          position: [-5904, 3296],
          id: "gmail-trigger-main",
          name: "Gmail Trigger",
          credentials: {
            gmailOAuth2: {
              id: "user_gmail_oauth",
              name: "Business Gmail"
            }
          }
        },
        {
          parameters: {
            promptType: "define",
            text: "=Subject: {{ $json.subject }}\nFrom:{{ $json.from }}\nTo: {{ $json.to }}\nDate: {{ $now }}\nThread ID: {{ $json.threadId }}\nMessage ID: {{ $json.id }}\n\nEmail Body:\n{{ $json.body }}",
            options: {
              systemMessage: "You are an expert email processing system for hot tub businesses. Analyze emails and return structured JSON classification."
            }
          },
          id: "ai-classifier-main",
          name: "AI Master Classifier",
          type: "@n8n/n8n-nodes-langchain.chatOpenAi",
          position: [-4800, 3296],
          typeVersion: 1.3
        },
        {
          parameters: {
            rules: {
              values: []
            },
            options: {}
          },
          type: "n8n-nodes-base.switch",
          typeVersion: 3.2,
          position: [-3856, 2880],
          id: "main-switch",
          name: "Category Switch"
        }
      ],
      connections: {
        "Gmail Trigger": {
          main: [
            [
              {
                node: "AI Master Classifier",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "AI Master Classifier": {
          main: [
            [
              {
                node: "Category Switch",
                type: "main",
                index: 0
              }
            ]
          ]
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
  async generatePersonalizedWorkflow(businessData, labelMappings, customManagers = [], customSuppliers = [], phoneSystem = 'RingCentral') {
    try {
      // Use the secure internal template
      const baseWorkflow = JSON.parse(JSON.stringify(this.baseTemplate));

      // Create personalized workflow
      const personalizedWorkflow = {
        ...baseWorkflow,
        name: `${businessData.company_name} - Email Automation Workflow`,
        meta: {
          instanceId: businessData.user_id,
          companyName: businessData.company_name,
          generatedAt: new Date().toISOString(),
          businessType: 'hot-tub-spa',
          phoneSystem: phoneSystem,
          customManagers: customManagers.slice(0, 5),
          customSuppliers: customSuppliers.slice(0, 10)
        }
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

      // Add standard label nodes for hot tub business
      const standardNodes = this.generateStandardLabelNodes(businessData);
      personalizedWorkflow.nodes.push(...standardNodes);

      // Add custom manager nodes
      const managerNodes = this.generateCustomManagerNodes(customManagers, businessData);
      personalizedWorkflow.nodes.push(...managerNodes);

      // Add custom supplier nodes
      const supplierNodes = this.generateCustomSupplierNodes(customSuppliers, businessData);
      personalizedWorkflow.nodes.push(...supplierNodes);

      // Update switch node with all categories
      const switchNode = personalizedWorkflow.nodes.find(node => node.name === 'Category Switch');
      if (switchNode) {
        this.updateSwitchNodeWithAllCategories(switchNode, customManagers, customSuppliers);
      }

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
   * Generate personalized system message for AI classifier
   */
  generatePersonalizedSystemMessage(businessData, customManagers, customSuppliers, phoneSystem) {
    const baseMessage = `You are an expert email processing and routing system for "${businessData.company_name}".

Your SOLE task is to analyze the provided email and return a single, structured JSON object containing a summary, precise classifications, and extracted entities. Follow all rules precisely.

### Business Information:
- Company: ${businessData.company_name}
- Phone: ${businessData.business_phone}
- Service Area: ${businessData.service_area_radius} miles
- Services: ${businessData.primary_services ? businessData.primary_services.join(', ') : 'Hot tub services'}
- Response Time Goal: ${businessData.response_time_goal || 'Within 24 hours'}
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
    let yPosition = 2896; // Starting position from template

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
    let yPosition = 4048; // Starting position from template

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
