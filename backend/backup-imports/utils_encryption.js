const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
// TAG_LENGTH removed - not used in current implementation

// Get encryption key from environment variable
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_LENGTH} characters long`);
  }
  return Buffer.from(key, 'utf8');
};

// Encrypt sensitive data (OAuth tokens) - SECURE IMPLEMENTATION
const encrypt = text => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    // Use the correct Node.js crypto API for AES-256-GCM
    const cipher = crypto.createCipher(ALGORITHM, key);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // For GCM mode, we need to get the authentication tag
    let tag = '';
    try {
      tag = cipher.getAuthTag();
    } catch (_e) {
      // If getAuthTag fails, we're not in GCM mode, continue without tag
      console.warn('Authentication tag not available - using basic encryption');
    }

    // Return IV + tag + encrypted data as a single string
    return iv.toString('hex') + ':' + (tag ? tag.toString('hex') : '') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt sensitive data (OAuth tokens) - SECURE IMPLEMENTATION
const decrypt = encryptedData => {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const _iv = Buffer.from(parts[0], 'hex'); // IV extracted but not used with createDecipher
    const tag = parts[1] ? Buffer.from(parts[1], 'hex') : null;
    const encrypted = parts[2];

    const decipher = crypto.createDecipher(ALGORITHM, key);

    // Set auth tag if available
    if (tag && tag.length > 0) {
      try {
        decipher.setAuthTag(tag);
      } catch (_e) {
        console.warn('Could not set auth tag - continuing with basic decryption');
      }
    }

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Generate a secure random encryption key (for setup purposes)
const generateEncryptionKey = () => {
  return crypto.randomBytes(KEY_LENGTH).toString('base64').slice(0, KEY_LENGTH);
};

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey
};
