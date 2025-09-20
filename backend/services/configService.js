/**
 * Client Configuration Service
 * Handles loading, validation, normalization, and saving of client configurations
 * for n8n workflow templates with version management and AI guardrails
 */

const { databaseOperations } = require('../database/database-operations');

/**
 * Default configuration template for new clients
 */
const DEFAULT_CONFIG = {
  client: {
    name: "",
    timezone: "UTC",
    website: "",
    phones: [],
    address: "",
    hours: {}
  },
  channels: {
    email: {
      provider: "gmail",
      label_map: {
        "Sales": "Sales",
        "Support": "Support",
        "Promo": "Promotions",
        "Banking": "Banking",
        "GoogleReview": "GoogleReview",
        "FormSub": "FormSub",
        "Phone": "Phone",
        "Manager": "Manager",
        "Suppliers": "Suppliers",
        "Urgent": "Urgent",
        "Misc": "Misc"
      }
    }
  },
  people: {
    managers: []
  },
  suppliers: [],
  signature: {
    mode: "default",
    custom_text: null,
    block_names_in_signature: true
  },
  ai: {
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 800,
    locked: true
  }
};

/**
 * Load client configuration with defaults if not found
 * @param {string} clientId - Client identifier
 * @returns {Promise<Object>} Configuration object with client_id and version
 */
async function loadConfig(clientId) {
  try {
    const result = await databaseOperations.getClientConfigRow(clientId);
    
    if (result.error || !result.data) {
      // Return default config for new clients
      return {
        client_id: clientId,
        version: 1,
        ...DEFAULT_CONFIG
      };
    }
    
    const configRow = result.data;
    return {
      client_id: clientId,
      version: Number(configRow.version), // Ensure version is a number
      ...configRow.config_json
    };
  } catch (error) {
    console.error('Error loading client config:', error);
    throw new Error('Failed to load client configuration');
  }
}

/**
 * Save client configuration with validation, normalization, and version bump
 * @param {string} clientId - Client identifier
 * @param {Object} configPatch - Configuration updates to apply
 * @returns {Promise<Object>} Result with new version number
 */
async function saveConfig(clientId, configPatch) {
  try {
    // Load existing config
    const existingConfig = await loadConfig(clientId);
    
    // Deep merge patch onto existing config
    const mergedConfig = deepMerge(existingConfig, configPatch);
    
    // Validate the merged configuration
    validateConfig(mergedConfig);
    
    // Normalize the configuration
    const normalizedConfig = normalizeConfig(mergedConfig);
    
    // Bump version (use current timestamp)
    const newVersion = Date.now();
    
    // Save to database
    const result = await databaseOperations.upsertClientConfigRow(
      clientId,
      newVersion,
      normalizedConfig
    );
    
    if (result.error) {
      throw new Error('Failed to save configuration to database');
    }
    
    return { version: newVersion };
  } catch (error) {
    if (error.code === 'VALIDATION_FAILED') {
      throw error; // Re-throw validation errors as-is
    }
    console.error('Error saving client config:', error);
    throw new Error('Failed to save client configuration');
  }
}

/**
 * Validate configuration object
 * @param {Object} config - Configuration to validate
 * @throws {Error} Validation error with code VALIDATION_FAILED
 */
function validateConfig(config) {
  const errors = [];
  
  // Required fields validation
  if (!config.client?.name || typeof config.client.name !== 'string' || config.client.name.trim() === '') {
    errors.push({ field: 'client.name', message: 'Client name is required' });
  }
  
  if (!config.client?.timezone || typeof config.client.timezone !== 'string') {
    errors.push({ field: 'client.timezone', message: 'Client timezone is required' });
  }
  
// WARNING: Parameter mismatch - if expects 1 parameters but called with 2
  if (!config.channels?.email?.provider || !['gmail', 'o365'].includes(config.channels.email.provider)) {
    errors.push({ field: 'channels.email.provider', message: 'Email provider must be "gmail" or "o365"' });
  }
  
  if (!config.people?.managers || !Array.isArray(config.people.managers) || config.people.managers.length === 0) {
    errors.push({ field: 'people.managers', message: 'At least one manager is required' });
  } else {
    // Validate first manager has name and email
    const firstManager = config.people.managers[0];
    if (!firstManager?.name || typeof firstManager.name !== 'string' || firstManager.name.trim() === '') {
      errors.push({ field: 'people.managers[0].name', message: 'First manager name is required' });
    }
    if (!firstManager?.email || typeof firstManager.email !== 'string' || !firstManager.email.includes('@')) {
      errors.push({ field: 'people.managers[0].email', message: 'First manager email is required and must be valid' });
    }
  }
  
  // Signature guardrail validation
  if (config.signature?.mode === 'custom' && 
      config.signature?.block_names_in_signature === true && 
      config.signature?.custom_text &&
      config.people?.managers) {
// WARNING: Parameter mismatch - if expects 1 parameters but called with 2
    
    if (containsManagerNameInSignature(config.signature.custom_text, config.people.managers)) {
      errors.push({ 
        field: 'signature.custom_text', 
        message: 'Custom signature cannot contain manager names when block_names_in_signature is enabled' 
      });
    }
  }
  
  if (errors.length > 0) {
    const error = new Error('Configuration validation failed');
    error.code = 'VALIDATION_FAILED';
    error.details = errors;
    throw error;
  }
}

/**
 * Normalize configuration data
 * @param {Object} config - Configuration to normalize
 * @returns {Object} Normalized configuration
 */
function normalizeConfig(config) {
  const normalized = JSON.parse(JSON.stringify(config)); // Deep clone
  
  // Remove client_id and version from the config data (these are stored separately)
  delete normalized.client_id;
  delete normalized.version;
  
  // Normalize supplier domains to lowercase and dedupe
  if (normalized.suppliers && Array.isArray(normalized.suppliers)) {
    normalized.suppliers = normalized.suppliers.map(supplier => {
      if (supplier.domains && Array.isArray(supplier.domains)) {
        // Convert to lowercase and remove duplicates
        supplier.domains = [...new Set(supplier.domains.map(domain => 
          typeof domain === 'string' ? domain.toLowerCase() : domain
        ))];
      }
      return supplier;
    });
  }
  
  // Normalize email label map - dedupe values and ensure strings
  if (normalized.channels?.email?.label_map) {
    const labelMap = normalized.channels.email.label_map;
    const normalizedMap = {};
// WARNING: Parameter mismatch - for expects 1 parameters but called with 2
    const seenValues = new Set();
    
    for (const [key, value] of Object.entries(labelMap)) {
      const stringValue = String(value);
      if (!seenValues.has(stringValue)) {
        normalizedMap[key] = stringValue;
        seenValues.add(stringValue);
      }
    }
    
    normalized.channels.email.label_map = normalizedMap;
  }
  
  // AI settings guardrail - ignore changes if locked
  if (config.ai?.locked === true) {
    // Preserve server-side canonical AI defaults, ignore any client changes
    normalized.ai = {
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 800,
      locked: true
    };
  }
  
  return normalized;
}

/**
 * Check if custom signature text contains any manager names
 * @param {string} customText - Custom signature text
 * @param {Array} managers - Array of manager objects with name property
 * @returns {boolean} True if signature contains manager names
 */
function containsManagerNameInSignature(customText, managers) {
  if (!customText || !managers || !Array.isArray(managers)) {
    return false;
  }
  
  const lowerText = customText.toLowerCase();
  
  return managers.some(manager => {
    if (!manager.name || typeof manager.name !== 'string') {
      return false;
    }
    
    const managerName = manager.name.toLowerCase();
    // Use word boundary check to avoid partial matches
    const regex = new RegExp(`\\b${managerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

module.exports = {
  loadConfig,
  saveConfig,
  validateConfig,
  normalizeConfig,
  containsManagerNameInSignature
};
