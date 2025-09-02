const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits

    // Get encryption key from environment or generate one
    this.masterKey = this.getMasterKey();
  }

  /**
   * Get or generate master encryption key
   * @returns {Buffer} Master encryption key
   */
  getMasterKey() {
    const keyFromEnv = process.env.ENCRYPTION_KEY;

    if (keyFromEnv) {
      // Use key from environment variable
      return Buffer.from(keyFromEnv, 'hex');
    } else {
      // Generate a new key (for development only)
      console.warn('⚠️  No ENCRYPTION_KEY found in environment. Generating temporary key.');
      console.warn('⚠️  This key will not persist across restarts. Set ENCRYPTION_KEY in production.');
      return crypto.randomBytes(this.keyLength);
    }
  }

  /**
   * Derive encryption key from master key and salt
   * @param {Buffer} salt - Salt for key derivation
   * @returns {Buffer} Derived key
   */
  deriveKey(salt) {
    return crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt data
   * @param {string} plaintext - Data to encrypt
   * @returns {Promise<string>} Encrypted data as base64 string
   */
  async encrypt(plaintext) {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derive key from master key and salt
      const key = this.deriveKey(salt);

      // Create cipher
      const cipher = crypto.createCipherGCM(this.algorithm, key, iv);
      cipher.setAAD(salt); // Use salt as additional authenticated data

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine salt, iv, tag, and encrypted data
      const combined = Buffer.concat([salt, iv, tag, encrypted]);

      // Return as base64 string
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   * @param {string} encryptedData - Encrypted data as base64 string
   * @returns {Promise<string>} Decrypted plaintext
   */
  async decrypt(encryptedData) {
    try {
      // Convert from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const tag = combined.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.saltLength + this.ivLength + this.tagLength);

      // Derive key from master key and salt
      const key = this.deriveKey(salt);

      // Create decipher
      const decipher = crypto.createDecipherGCM(this.algorithm, key, iv);
      decipher.setAAD(salt); // Use salt as additional authenticated data
      decipher.setAuthTag(tag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt OAuth tokens for secure storage
   * @param {Object} tokens - OAuth tokens object
   * @returns {Promise<Object>} Encrypted tokens object
   */
  async encryptOAuthTokens(tokens) {
    try {
      const encryptedTokens = {};

      if (tokens.access_token) {
        encryptedTokens.access_token = await this.encrypt(tokens.access_token);
      }

      if (tokens.refresh_token) {
        encryptedTokens.refresh_token = await this.encrypt(tokens.refresh_token);
      }

      // Copy non-sensitive fields as-is
      if (tokens.token_type) {
        encryptedTokens.token_type = tokens.token_type;
      }
      if (tokens.scope) {
        encryptedTokens.scope = tokens.scope;
      }
      if (tokens.expiry_date) {
        encryptedTokens.expiry_date = tokens.expiry_date;
      }

      return encryptedTokens;
    } catch (error) {
      console.error('OAuth token encryption error:', error);
      throw new Error('Failed to encrypt OAuth tokens');
    }
  }

  /**
   * Decrypt OAuth tokens for use
   * @param {Object} encryptedTokens - Encrypted tokens object
   * @returns {Promise<Object>} Decrypted tokens object
   */
  async decryptOAuthTokens(encryptedTokens) {
    try {
      const decryptedTokens = {};

      if (encryptedTokens.access_token) {
        decryptedTokens.access_token = await this.decrypt(encryptedTokens.access_token);
      }

      if (encryptedTokens.refresh_token) {
        decryptedTokens.refresh_token = await this.decrypt(encryptedTokens.refresh_token);
      }

      // Copy non-sensitive fields as-is
      if (encryptedTokens.token_type) {
        decryptedTokens.token_type = encryptedTokens.token_type;
      }
      if (encryptedTokens.scope) {
        decryptedTokens.scope = encryptedTokens.scope;
      }
      if (encryptedTokens.expiry_date) {
        decryptedTokens.expiry_date = encryptedTokens.expiry_date;
      }

      return decryptedTokens;
    } catch (error) {
      console.error('OAuth token decryption error:', error);
      throw new Error('Failed to decrypt OAuth tokens');
    }
  }

  /**
   * Generate secure random string
   * @param {number} length - Length of random string
   * @returns {string} Random string
   */
  generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data with salt
   * @param {string} data - Data to hash
   * @param {string} salt - Salt for hashing (optional)
   * @returns {Object} Hash result with salt and hash
   */
  hashWithSalt(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }

    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha256').toString('hex');

    return {
      salt,
      hash,
      combined: `${salt}:${hash}`
    };
  }

  /**
   * Verify hashed data
   * @param {string} data - Original data
   * @param {string} combined - Combined salt:hash string
   * @returns {boolean} Verification result
   */
  verifyHash(data, combined) {
    try {
      const [salt, hash] = combined.split(':');
      const verification = this.hashWithSalt(data, salt);
      return verification.hash === hash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create backup of encryption key (for recovery purposes)
   * @returns {Object} Key backup information
   */
  createKeyBackup() {
    const keyBackup = {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      masterKeyHash: crypto.createHash('sha256').update(this.masterKey).digest('hex'),
      created: new Date().toISOString()
    };

    return keyBackup;
  }

  /**
   * Validate encryption key
   * @returns {Promise<boolean>} Key validation result
   */
  async validateKey() {
    try {
      // Test encryption/decryption with the current key
      const testData = 'encryption-test-' + Date.now();
      const encrypted = await this.encrypt(testData);
      const decrypted = await this.decrypt(encrypted);

      return decrypted === testData;
    } catch (error) {
      console.error('Key validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EncryptionService();
