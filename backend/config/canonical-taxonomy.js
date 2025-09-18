/**
 * Canonical Mailbox Taxonomy Configuration
 * Defines the standard label/folder structure and colors for FloWorx email automation
 */

// Canonical color palette (hex values)
const CANONICAL_COLORS = {
  RED: '#FF0000',      // Urgent, Critical
  GREEN: '#00FF00',    // Sales, Opportunities
  BLUE: '#0000FF',     // Support, Customer Service
  ORANGE: '#FFA500',   // Suppliers, Vendors
  YELLOW: '#FFFF00',   // Manager, Internal
  PINK: '#FF69B4'      // Misc, General
};

// Canonical taxonomy structure
const CANONICAL_TAXONOMY = {
  // Critical/Urgent items requiring immediate attention
  URGENT: {
    path: ['URGENT'],
    color: CANONICAL_COLORS.RED,
    description: 'Emergency situations, critical issues, immediate attention required',
    priority: 1,
    examples: ['Emergency repairs', 'Safety hazards', 'System failures', 'Angry customers']
  },

  // Sales opportunities and revenue-generating activities
  SALES: {
    path: ['SALES'],
    color: CANONICAL_COLORS.GREEN,
    description: 'Sales inquiries, quotes, new business opportunities',
    priority: 2,
    examples: ['Quote requests', 'New installations', 'Product inquiries', 'Upgrade consultations']
  },

  // Customer support and service requests
  SUPPORT: {
    path: ['SUPPORT'],
    color: CANONICAL_COLORS.BLUE,
    description: 'Customer service, maintenance requests, general support',
    priority: 3,
    examples: ['Maintenance scheduling', 'How-to questions', 'Warranty claims', 'General inquiries']
  },

  // Supplier and vendor communications
  SUPPLIERS: {
    path: ['SUPPLIERS'],
    color: CANONICAL_COLORS.ORANGE,
    description: 'Vendor communications, parts orders, delivery notifications',
    priority: 4,
    examples: ['Parts availability', 'Delivery notifications', 'Invoice/billing', 'Technical bulletins']
  },

  // Internal management and team communications
  MANAGER: {
    path: ['MANAGER'],
    color: CANONICAL_COLORS.YELLOW,
    description: 'Internal communications, management, team coordination',
    priority: 5,
    examples: ['Team communications', 'Administrative matters', 'Project coordination', 'Policy updates']
  },

  // Miscellaneous and unclassified items
  MISC: {
    path: ['MISC'],
    color: CANONICAL_COLORS.PINK,
    description: 'General inquiries, unclassified emails, miscellaneous items',
    priority: 6,
    examples: ['General inquiries', 'Newsletters', 'Unclassified emails', 'Other communications']
  }
};

// Alternative taxonomy structures for different business types
const ALTERNATIVE_TAXONOMIES = {
  // Banking/Financial services
  BANKING: {
    URGENT: { path: ['BANKING', 'URGENT'], color: CANONICAL_COLORS.RED },
    LOANS: { path: ['BANKING', 'LOANS'], color: CANONICAL_COLORS.GREEN },
    ACCOUNTS: { path: ['BANKING', 'ACCOUNTS'], color: CANONICAL_COLORS.BLUE },
    COMPLIANCE: { path: ['BANKING', 'COMPLIANCE'], color: CANONICAL_COLORS.ORANGE },
    INTERNAL: { path: ['BANKING', 'INTERNAL'], color: CANONICAL_COLORS.YELLOW },
    GENERAL: { path: ['BANKING', 'GENERAL'], color: CANONICAL_COLORS.PINK }
  },

  // Healthcare services
  HEALTHCARE: {
    EMERGENCY: { path: ['HEALTHCARE', 'EMERGENCY'], color: CANONICAL_COLORS.RED },
    APPOINTMENTS: { path: ['HEALTHCARE', 'APPOINTMENTS'], color: CANONICAL_COLORS.GREEN },
    PATIENT_CARE: { path: ['HEALTHCARE', 'PATIENT_CARE'], color: CANONICAL_COLORS.BLUE },
    INSURANCE: { path: ['HEALTHCARE', 'INSURANCE'], color: CANONICAL_COLORS.ORANGE },
    STAFF: { path: ['HEALTHCARE', 'STAFF'], color: CANONICAL_COLORS.YELLOW },
    GENERAL: { path: ['HEALTHCARE', 'GENERAL'], color: CANONICAL_COLORS.PINK }
  }
};

// Provider-specific configurations
const PROVIDER_CONFIGS = {
  gmail: {
    maxLabelLength: 100,
    maxNestingDepth: 3,
    supportedColors: Object.values(CANONICAL_COLORS),
    colorFormat: 'hex',
    pathSeparator: '/',
    caseSensitive: false
  },
  
  o365: {
    maxCategoryLength: 255,
    maxNestingDepth: 2,
    supportedColors: Object.values(CANONICAL_COLORS),
    colorFormat: 'hex',
    pathSeparator: '\\',
    caseSensitive: false
  }
};

// Utility functions
const TaxonomyUtils = {
  /**
   * Get canonical taxonomy for a specific business type
   */
  getTaxonomy(businessType = 'default') {
    if (businessType === 'default' || !ALTERNATIVE_TAXONOMIES[businessType.toUpperCase()]) {
      return CANONICAL_TAXONOMY;
    }
    return ALTERNATIVE_TAXONOMIES[businessType.toUpperCase()];
  },

  /**
   * Get provider-specific configuration
   */
  getProviderConfig(provider) {
    return PROVIDER_CONFIGS[provider.toLowerCase()] || PROVIDER_CONFIGS.gmail;
  },

  /**
   * Convert taxonomy to flat array for API responses
   */
  toFlatArray(taxonomy = CANONICAL_TAXONOMY) {
    return Object.entries(taxonomy).map(([key, config]) => ({
      key,
      ...config
    }));
  },

  /**
   * Get taxonomy item by key
   */
  getItem(key, taxonomy = CANONICAL_TAXONOMY) {
    return taxonomy[key.toUpperCase()];
  },

  /**
   * Validate taxonomy structure
   */
  validateTaxonomy(taxonomy) {
    const requiredFields = ['path', 'color', 'description', 'priority'];
    
    for (const [key, config] of Object.entries(taxonomy)) {
      for (const field of requiredFields) {
        if (!config[field]) {
          throw new Error(`Missing required field '${field}' in taxonomy item '${key}'`);
        }
      }
      
      // Validate color format
      if (!/^#[0-9A-F]{6}$/i.test(config.color)) {
        throw new Error(`Invalid color format '${config.color}' in taxonomy item '${key}'`);
      }
      
      // Validate path
      if (!Array.isArray(config.path) || config.path.length === 0) {
        throw new Error(`Invalid path in taxonomy item '${key}'`);
      }
    }
    
    return true;
  },

  /**
   * Generate provider-specific path string
   */
  generatePath(pathArray, provider = 'gmail') {
    const config = this.getProviderConfig(provider);
    return pathArray.join(config.pathSeparator);
  }
};

module.exports = {
  CANONICAL_COLORS,
  CANONICAL_TAXONOMY,
  ALTERNATIVE_TAXONOMIES,
  PROVIDER_CONFIGS,
  TaxonomyUtils
};
