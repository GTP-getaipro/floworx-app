const { query } = require('../database/unified-connection');

class IntelligentLabelMatcher {
  constructor() {
    // Define the exact label structure from the n8n template for hot tub businesses
    this.standardLabels = {
      // Core categories matching n8n workflow
      urgent: {
        name: 'Urgent',
        priority: 'urgent',
        ai_can_reply: false,
        n8n_category: 'Urgent',
        label_id: 'Label_Urgent' // Will be dynamically assigned
      },
      sales: {
        name: 'Sales',
        priority: 'high',
        ai_can_reply: true,
        n8n_category: 'Sales',
        label_id: 'Label_1381962670795847883' // From n8n template
      },

      // Support categories
      support: {
        name: 'Support',
        priority: 'medium',
        ai_can_reply: false,
        n8n_category: 'Support',
        label_id: 'Label_Support'
      },
      support_technical: {
        name: 'Support - Technical',
        priority: 'high',
        ai_can_reply: true,
        n8n_category: 'Support',
        secondary_category: 'TechnicalSupport'
      },
      support_parts: {
        name: 'Support - Parts & Chemicals',
        priority: 'medium',
        ai_can_reply: true,
        n8n_category: 'Support',
        secondary_category: 'PartsAndChemicals'
      },
      support_appointments: {
        name: 'Support - Appointments',
        priority: 'medium',
        ai_can_reply: true,
        n8n_category: 'Support',
        secondary_category: 'AppointmentScheduling'
      },
      support_general: {
        name: 'Support - General',
        priority: 'low',
        ai_can_reply: true,
        n8n_category: 'Support',
        secondary_category: 'General'
      },

      // Manager categories (customizable up to 5)
      manager: {
        name: 'Manager',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'Manager',
        label_id: 'Label_Manager'
      },
      manager_hailey: {
        name: 'Manager - Hailey',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'Manager',
        secondary_category: 'Hailey'
      },
      manager_jillian: {
        name: 'Manager - Jillian',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'Manager',
        secondary_category: 'Jillian'
      },
      manager_stacie: {
        name: 'Manager - Stacie',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'Manager',
        secondary_category: 'Stacie',
        label_id: 'Label_2203765197792162701' // From n8n template
      },
      manager_aaron: {
        name: 'Manager - Aaron',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'Manager',
        secondary_category: 'Aaron',
        label_id: 'Label_3547461587166103613' // From n8n template
      },
      manager_unassigned: {
        name: 'Manager - Unassigned',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'Manager',
        secondary_category: 'Unassigned'
      },

      // Banking categories
      banking: {
        name: 'Banking',
        priority: 'medium',
        ai_can_reply: false,
        n8n_category: 'Banking'
      },
      banking_etransfer: {
        name: 'Banking - E-Transfer',
        priority: 'medium',
        ai_can_reply: false,
        n8n_category: 'Banking',
        secondary_category: 'e-transfer',
        label_id: 'Label_8879565119088926061' // From n8n template
      },
      banking_etransfer_from: {
        name: 'Banking - E-Transfer - From Business',
        priority: 'medium',
        ai_can_reply: false,
        n8n_category: 'Banking',
        secondary_category: 'e-transfer',
        tertiary_category: 'FromBusiness'
      },
      banking_etransfer_to: {
        name: 'Banking - E-Transfer - To Business',
        priority: 'medium',
        ai_can_reply: false,
        n8n_category: 'Banking',
        secondary_category: 'e-transfer',
        tertiary_category: 'ToBusiness'
      },
      banking_invoices: {
        name: 'Banking - Invoices',
        priority: 'medium',
        ai_can_reply: false,
        n8n_category: 'Banking',
        secondary_category: 'invoice',
        label_id: 'Label_1097875258825754279' // From n8n template
      },
      banking_alerts: {
        name: 'Banking - Bank Alerts',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Banking',
        secondary_category: 'bank-alert'
      },
      banking_refunds: {
        name: 'Banking - Refunds',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'Banking',
        secondary_category: 'refund'
      },
      banking_receipts: {
        name: 'Banking - Receipts',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Banking',
        secondary_category: 'receipts'
      },
      banking_receipts_sent: {
        name: 'Banking - Receipts - Payment Sent',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Banking',
        secondary_category: 'receipts',
        tertiary_category: 'PaymentSent'
      },
      banking_receipts_received: {
        name: 'Banking - Receipts - Payment Received',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Banking',
        secondary_category: 'receipts',
        tertiary_category: 'PaymentReceived',
        label_id: 'Label_6185303115826930212' // From n8n template
      },

      // Suppliers (user can add up to 10)
      suppliers: {
        name: 'Suppliers',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Suppliers',
        label_id: 'Label_5910952788693218903' // From n8n template
      },
      suppliers_aqua_spa: {
        name: 'Suppliers - Aqua Spa Pool Supply',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Suppliers',
        secondary_category: 'AquaSpaPoolSupply',
        label_id: 'Label_1754819594410264536' // From n8n template
      },
      suppliers_paradise_patio: {
        name: 'Suppliers - Paradise Patio Furniture Ltd',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Suppliers',
        secondary_category: 'ParadisePatioFurnitureLtd',
        label_id: 'Label_9221639982004118374' // From n8n template
      },
      suppliers_strong_spas: {
        name: 'Suppliers - Strong Spas',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Suppliers',
        secondary_category: 'StrongSpas',
        label_id: 'Label_529082710264521909' // From n8n template
      },
      suppliers_waterway: {
        name: 'Suppliers - Waterway Plastics',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Suppliers',
        secondary_category: 'WaterwayPlastics'
      },

      // Form submissions
      formsub: {
        name: 'FormSub',
        priority: 'medium',
        ai_can_reply: false,
        n8n_category: 'FormSub'
      },
      formsub_new: {
        name: 'FormSub - New Submission',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'FormSub',
        secondary_category: 'NewSubmission'
      },
      formsub_workorder: {
        name: 'FormSub - Work Order Forms',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'FormSub',
        secondary_category: 'WorkOrderForms'
      },

      // Other categories
      recruitment: {
        name: 'Recruitment',
        priority: 'low',
        ai_can_reply: false,
        n8n_category: 'Recruitment',
        label_id: 'Label_3970665389479569628' // From n8n template
      },
      promo: {
        name: 'Promo',
        priority: 'low',
        ai_can_reply: true,
        n8n_category: 'Promo'
      },
      social_media: {
        name: 'Social Media',
        priority: 'low',
        ai_can_reply: true,
        n8n_category: 'Socialmedia',
        label_id: 'Label_2672320601196095158' // From n8n template
      },
      google_reviews: {
        name: 'Google Reviews',
        priority: 'medium',
        ai_can_reply: false,
        n8n_category: 'GoogleReview'
      },
      phone: {
        name: 'Phone',
        priority: 'high',
        ai_can_reply: false,
        n8n_category: 'Phone'
      },
      misc: {
        name: 'Misc',
        priority: 'low',
        ai_can_reply: true,
        n8n_category: 'Misc',
        label_id: 'Label_6896136905128060519' // From n8n template
      }
    };

    // Pattern matching for automatic label detection
    this.labelPatterns = {
      urgent: /urgent|emergency|asap|critical|immediate|broken.*down|not.*working|leak/i,
      sales: /quote|estimate|price|cost|new.*customer|lead|inquiry.*price|buy|purchase|install/i,
      support_technical: /technical|repair|fix|broken|malfunction|error|troubleshoot|diagnostic/i,
      support_parts: /parts|chemicals|supplies|filter|chlorine|bromine|ph|alkalinity|ozone/i,
      support_appointments: /appointment|schedule|booking|visit|service.*call|when.*can/i,
      support_general: /question|help|how.*to|general.*inquiry|support/i,
      manager: /manager|supervisor|complaint|escalate|speak.*to.*manager/i,
      banking_etransfer: /e-transfer|etransfer|interac|money.*transfer/i,
      banking_invoices: /invoice|bill|payment.*due|account.*statement/i,
      banking_refunds: /refund|return.*money|credit|reimburse/i,
      banking_receipts: /receipt|payment.*confirmation|transaction/i,
      suppliers: /supplier|vendor|wholesale|parts.*order|delivery/i,
      formsub_new: /form.*submission|new.*form|contact.*form/i,
      formsub_workorder: /work.*order|service.*request.*form|job.*form/i,
      recruitment: /job|career|hiring|employment|resume|application/i,
      promo: /promotion|discount|sale|special.*offer|coupon/i,
      social_media: /facebook|instagram|twitter|social.*media|review.*request/i,
      google_reviews: /google.*review|review.*google|rating/i,
      phone: /phone.*call|voicemail|missed.*call|call.*back/i
    };

    // Hot tub specific terms for enhanced matching
    this.hotTubTerms = [
      'hot tub', 'spa', 'jacuzzi', 'whirlpool', 'jets', 'heater', 'pump', 'filter',
      'chemicals', 'chlorine', 'bromine', 'ph', 'alkalinity', 'cover', 'ozone',
      'circulation', 'plumbing', 'electrical', 'gfci', 'winterize', 'drain'
    ];

    // Minimum confidence threshold for automatic mapping
    this.confidenceThreshold = 0.6;
  }

  /**
   * Analyze Gmail labels and find matches for hot tub business standard labels
   * @param {Array} gmailLabels - User's Gmail labels
   * @returns {Object} Analysis results with matches and recommendations
   */
  async analyzeLabelsForAutomation(gmailLabels) {
    try {
      const matches = [];
      const unmatchedLabels = [];
      const missingStandardLabels = [];

      console.log(`Analyzing ${gmailLabels.length} Gmail labels against hot tub business standard labels`);

      // Check each Gmail label against standard patterns
      for (const label of gmailLabels) {
        // Skip system labels
        if (this.isSystemLabel(label)) {
          continue;
        }

        let bestMatch = null;
        let bestConfidence = 0;

        // Check against each standard label pattern
        for (const [standardKey, standardLabel] of Object.entries(this.standardLabels)) {
          const pattern = this.labelPatterns[standardKey];
          if (!pattern) continue;

          const confidence = this.calculateMatchConfidence(label.name, pattern);

          if (confidence > bestConfidence && confidence >= this.confidenceThreshold) {
            bestMatch = {
              standardKey,
              standardLabel,
              confidence
            };
            bestConfidence = confidence;
          }
        }

        if (bestMatch) {
          matches.push({
            gmailLabelId: label.id,
            gmailLabelName: label.name,
            standardLabelKey: bestMatch.standardKey,
            standardLabelName: bestMatch.standardLabel.name,
            priority: bestMatch.standardLabel.priority,
            aiCanReply: bestMatch.standardLabel.ai_can_reply,
            confidence: bestMatch.confidence,
            messagesCount: label.messagesTotal || 0,
            recommended: true
          });
        } else {
          unmatchedLabels.push({
            gmailLabelId: label.id,
            gmailLabelName: label.name,
            messagesCount: label.messagesTotal || 0
          });
        }
      }

      // Find missing critical standard labels
      const matchedStandardKeys = matches.map(m => m.standardLabelKey);
      const criticalLabels = ['urgent', 'sales', 'support_technical', 'support_appointments', 'manager'];

      for (const criticalKey of criticalLabels) {
        if (!matchedStandardKeys.includes(criticalKey)) {
          missingStandardLabels.push({
            key: criticalKey,
            name: this.standardLabels[criticalKey].name,
            priority: this.standardLabels[criticalKey].priority,
            needsCreation: true
          });
        }
      }

      // Calculate automation readiness
      const automationScore = this.calculateAutomationReadiness(matches, gmailLabels.length, missingStandardLabels.length);

      return {
        hasUsableLabels: matches.length > 0,
        automationReady: automationScore >= 0.4,
        automationScore,
        recommendedMappings: matches,
        unmatchedLabels,
        missingStandardLabels,
        analysis: {
          totalLabels: gmailLabels.length,
          matchedLabels: matches.length,
          highConfidenceMatches: matches.filter(m => m.confidence >= 0.8).length,
          criticalLabelsCovered: criticalLabels.length - missingStandardLabels.length,
          totalCriticalLabels: criticalLabels.length,
          aiRepliesEnabled: matches.filter(m => m.aiCanReply).length
        }
      };

    } catch (error) {
      console.error('Error analyzing labels for hot tub automation:', error);
      throw error;
    }
  }

  /**
   * Calculate match confidence between label name and hot tub/spa pattern
   * @param {string} labelName - Gmail label name
   * @param {RegExp} pattern - Pattern to match against
   * @returns {number} Confidence score 0-1
   */
  calculateMatchConfidence(labelName, pattern) {
    if (!pattern.test(labelName)) {
      return 0;
    }

    // Base confidence for pattern match
    let confidence = 0.6;

    // Boost confidence for exact word matches
    const words = labelName.toLowerCase().split(/\s+/);
    const patternSource = pattern.source.toLowerCase();

    for (const word of words) {
      if (patternSource.includes(word)) {
        confidence += 0.1;
      }
    }

    // Boost for hot tub specific terms
    for (const term of this.hotTubTerms) {
      if (labelName.toLowerCase().includes(term)) {
        confidence += 0.15; // Higher boost for industry-specific terms
      }
    }

    // Boost for common business terms
    const businessTerms = ['customer', 'service', 'urgent', 'complaint', 'inquiry', 'booking', 'repair', 'maintenance'];
    for (const term of businessTerms) {
      if (labelName.toLowerCase().includes(term)) {
        confidence += 0.05;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate automation readiness score specifically for hot tub businesses
   * @param {Array} matches - Matched labels
   * @param {number} totalLabels - Total number of labels
   * @returns {number} Readiness score 0-1
   */
  calculateHotTubAutomationReadiness(matches, totalLabels) {
    if (matches.length === 0) return 0;

    // Base score from match ratio
    const matchRatio = matches.length / Math.max(totalLabels, 1);
    let score = matchRatio * 0.3;

    // Bonus for high confidence matches
    const highConfidenceCount = matches.filter(m => m.confidence >= 0.8).length;
    score += (highConfidenceCount / matches.length) * 0.3;

    // Critical categories for hot tub businesses
    const criticalCategories = ['service_request', 'new_customer', 'complaint'];
    const criticalCovered = matches.filter(m => criticalCategories.includes(m.n8nCategory)).length;
    score += (criticalCovered / criticalCategories.length) * 0.4;

    return Math.min(score, 1.0);
  }

  /**
   * Get critical categories covered for hot tub business
   * @param {Array} matches - Matched labels
   * @returns {Object} Critical categories coverage
   */
  getCriticalCategoriesCovered(matches) {
    const criticalCategories = {
      service_request: false,
      new_customer: false,
      complaint: false
    };

    matches.forEach(match => {
      if (criticalCategories.hasOwnProperty(match.n8nCategory)) {
        criticalCategories[match.n8nCategory] = true;
      }
    });

    return criticalCategories;
  }

  /**
   * Calculate automation readiness score
   * @param {Array} matches - Matched labels
   * @param {number} totalLabels - Total number of labels
   * @returns {number} Readiness score 0-1
   */
  calculateAutomationReadiness(matches, totalLabels) {
    if (matches.length === 0) return 0;

    // Base score from match ratio
    const matchRatio = matches.length / Math.max(totalLabels, 1);
    let score = matchRatio * 0.4;

    // Bonus for high confidence matches
    const highConfidenceCount = matches.filter(m => m.confidence >= 0.8).length;
    score += (highConfidenceCount / matches.length) * 0.3;

    // Bonus for category coverage
    const uniqueCategories = [...new Set(matches.map(m => m.n8nCategory))].length;
    const expectedCategories = 4; // Minimum categories for good automation
    score += Math.min(uniqueCategories / expectedCategories, 1) * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Check if label is a system label that should be ignored
   * @param {Object} label - Gmail label object
   * @returns {boolean} True if system label
   */
  isSystemLabel(label) {
    const systemLabels = [
      'INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED', 'IMPORTANT',
      'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 
      'CATEGORY_UPDATES', 'CATEGORY_FORUMS', 'UNREAD'
    ];

    return systemLabels.includes(label.id) || 
           label.id.startsWith('CATEGORY_') || 
           label.id.startsWith('CHAT') ||
           label.type === 'system';
  }

  /**
   * Generate hot tub & spa business data collection form
   * @param {Object} analysisResult - Result from analyzeLabelsForAutomation
   * @returns {Object} Form configuration for collecting hot tub business data
   */
  generateBusinessDataForm(analysisResult) {
    const companyFields = [
      {
        id: 'company_name',
        label: 'Company Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Sunshine Hot Tub Services',
        validation: { minLength: 2, maxLength: 100 },
        description: 'This will be used in automated email responses'
      },
      {
        id: 'business_phone',
        label: 'Business Phone',
        type: 'tel',
        required: true,
        placeholder: '+1 (555) 123-4567',
        validation: { pattern: /^\+?[\d\s\-\(\)]+$/ },
        description: 'Primary contact number for customers'
      },
      {
        id: 'emergency_phone',
        label: 'Emergency/After Hours Phone',
        type: 'tel',
        required: false,
        placeholder: '+1 (555) 999-9999',
        validation: { pattern: /^\+?[\d\s\-\(\)]+$/ },
        description: 'For urgent hot tub issues (optional)'
      },
      {
        id: 'business_address',
        label: 'Business Address',
        type: 'textarea',
        required: true,
        placeholder: '123 Main St, City, State 12345',
        validation: { minLength: 10, maxLength: 200 },
        description: 'Used for service area calculations'
      }
    ];

    const hotTubFields = [
      {
        id: 'service_area_radius',
        label: 'Service Area Radius (miles)',
        type: 'number',
        required: true,
        placeholder: '25',
        validation: { min: 1, max: 100 },
        description: 'How far do you travel for service calls?'
      },
      {
        id: 'primary_services',
        label: 'Primary Services Offered',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'installation', label: 'Hot Tub Installation & Setup' },
          { value: 'repair', label: 'Repair & Troubleshooting' },
          { value: 'maintenance', label: 'Regular Maintenance & Cleaning' },
          { value: 'water_care', label: 'Water Testing & Chemical Balancing' },
          { value: 'parts', label: 'Parts & Supplies Sales' },
          { value: 'warranty', label: 'Warranty Service' },
          { value: 'winterization', label: 'Winterization & Seasonal Prep' },
          { value: 'electrical', label: 'Electrical Work' },
          { value: 'plumbing', label: 'Plumbing & Leak Repair' }
        ],
        description: 'Select all services you provide'
      },
      {
        id: 'business_hours',
        label: 'Business Hours',
        type: 'text',
        required: true,
        placeholder: 'Mon-Fri 8AM-6PM, Sat 9AM-4PM',
        validation: { minLength: 5, maxLength: 100 },
        description: 'When customers can expect responses'
      },
      {
        id: 'response_time_goal',
        label: 'Response Time Goal',
        type: 'select',
        required: true,
        options: [
          { value: '1_hour', label: 'Within 1 hour' },
          { value: '4_hours', label: 'Within 4 hours' },
          { value: '24_hours', label: 'Within 24 hours' },
          { value: '48_hours', label: 'Within 48 hours' }
        ],
        description: 'How quickly do you aim to respond to emails?'
      },
      {
        id: 'team_size',
        label: 'Team Size',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: 'Just me (solo business)' },
          { value: '2-3', label: '2-3 technicians' },
          { value: '4-10', label: '4-10 employees' },
          { value: '10+', label: '10+ employees' }
        ],
        description: 'Size of your service team'
      }
    ];

    return {
      title: 'Complete Your Hot Tub Business Profile',
      description: 'These details will be used to customize your email automation and n8n workflow filters for optimal performance.',
      sections: [
        {
          title: 'Company Information',
          description: 'Basic business details for customer communications',
          fields: companyFields
        },
        {
          title: 'Hot Tub Service Details',
          description: 'Service-specific information for automation rules',
          fields: hotTubFields
        }
      ],
      automationContext: {
        hasLabels: analysisResult.hasUsableLabels,
        automationScore: analysisResult.automationScore,
        skipLabelMapping: !analysisResult.hasUsableLabels || analysisResult.automationScore < 0.3,
        criticalCategoriesCovered: analysisResult.analysis.criticalCategoriesCovered,
        recommendedMappings: analysisResult.recommendedMappings
      }
    };
  }

  /**
   * Get business-specific form fields
   * @param {string} businessType - Business type
   * @param {Object} analysisResult - Label analysis result
   * @returns {Array} Business-specific form fields
   */
  getBusinessSpecificFields(businessType, analysisResult) {
    if (businessType === 'hot-tub-spa') {
      return [
        {
          id: 'service_area_radius',
          label: 'Service Area Radius (miles)',
          type: 'number',
          required: true,
          placeholder: '25',
          validation: { min: 1, max: 100 }
        },
        {
          id: 'primary_services',
          label: 'Primary Services',
          type: 'multiselect',
          required: true,
          options: [
            { value: 'installation', label: 'Hot Tub Installation' },
            { value: 'repair', label: 'Repair & Maintenance' },
            { value: 'cleaning', label: 'Cleaning Services' },
            { value: 'parts', label: 'Parts & Supplies' },
            { value: 'warranty', label: 'Warranty Services' }
          ]
        },
        {
          id: 'emergency_contact',
          label: 'Emergency Contact Number',
          type: 'tel',
          required: false,
          placeholder: '+1 (555) 999-9999'
        },
        {
          id: 'business_hours',
          label: 'Business Hours',
          type: 'text',
          required: true,
          placeholder: 'Mon-Fri 8AM-6PM, Sat 9AM-4PM'
        }
      ];
    }

    // General business fields
    return [
      {
        id: 'industry',
        label: 'Industry',
        type: 'select',
        required: true,
        options: [
          { value: 'professional_services', label: 'Professional Services' },
          { value: 'retail', label: 'Retail' },
          { value: 'healthcare', label: 'Healthcare' },
          { value: 'technology', label: 'Technology' },
          { value: 'manufacturing', label: 'Manufacturing' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        id: 'team_size',
        label: 'Team Size',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: 'Just me' },
          { value: '2-5', label: '2-5 employees' },
          { value: '6-20', label: '6-20 employees' },
          { value: '21-50', label: '21-50 employees' },
          { value: '50+', label: '50+ employees' }
        ]
      },
      {
        id: 'primary_email_types',
        label: 'Primary Email Types You Handle',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'customer_inquiries', label: 'Customer Inquiries' },
          { value: 'sales_leads', label: 'Sales Leads' },
          { value: 'support_requests', label: 'Support Requests' },
          { value: 'complaints', label: 'Complaints' },
          { value: 'billing', label: 'Billing/Payments' }
        ]
      }
    ];
  }

  /**
   * Get missing automation categories
   * @param {Object} analysisResult - Label analysis result
   * @param {string} businessType - Business type
   * @returns {Array} Missing categories
   */
  getMissingCategories(analysisResult, businessType) {
    const patterns = this.n8nLabelPatterns[businessType] || this.n8nLabelPatterns.general;
    const expectedCategories = patterns.map(p => p.category);
    const foundCategories = analysisResult.recommendedMappings.map(m => m.n8nCategory);
    
    return expectedCategories.filter(cat => !foundCategories.includes(cat));
  }
}

module.exports = IntelligentLabelMatcher;
