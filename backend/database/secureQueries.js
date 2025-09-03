/**
 * Secure Database Query Layer for FloWorx SaaS
 * All queries use parameterized statements to prevent SQL injection
 * Implements query validation, logging, and performance monitoring
 */

const { query, transaction } = require('./unified-connection');
const { DatabaseError, ValidationError } = require('../utils/errors');
const cacheService = require('../services/cacheService');
const performanceService = require('../services/performanceService');

/**
 * Secure query builder with automatic parameterization
 */
class SecureQueryBuilder {
  constructor() {
    this.queryText = '';
    this.parameters = [];
    this.paramCount = 0;
  }

  /**
   * Add a WHERE clause with parameterized values
   */
  where(column, operator, value) {
    const paramIndex = ++this.paramCount;
    this.queryText += ` WHERE ${this.escapeIdentifier(column)} ${operator} $${paramIndex}`;
    this.parameters.push(value);
    return this;
  }

  /**
   * Add an AND clause with parameterized values
   */
  and(column, operator, value) {
    const paramIndex = ++this.paramCount;
    this.queryText += ` AND ${this.escapeIdentifier(column)} ${operator} $${paramIndex}`;
    this.parameters.push(value);
    return this;
  }

  /**
   * Add an OR clause with parameterized values
   */
  or(column, operator, value) {
    const paramIndex = ++this.paramCount;
    this.queryText += ` OR ${this.escapeIdentifier(column)} ${operator} $${paramIndex}`;
    this.parameters.push(value);
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  orderBy(column, direction = 'ASC') {
    const validDirections = ['ASC', 'DESC'];
    if (!validDirections.includes(direction.toUpperCase())) {
      throw new ValidationError('Invalid sort direction');
    }
    this.queryText += ` ORDER BY ${this.escapeIdentifier(column)} ${direction}`;
    return this;
  }

  /**
   * Add LIMIT clause
   */
  limit(count) {
    const paramIndex = ++this.paramCount;
    this.queryText += ` LIMIT $${paramIndex}`;
    this.parameters.push(parseInt(count));
    return this;
  }

  /**
   * Add OFFSET clause
   */
  offset(count) {
    const paramIndex = ++this.paramCount;
    this.queryText += ` OFFSET $${paramIndex}`;
    this.parameters.push(parseInt(count));
    return this;
  }

  /**
   * Escape SQL identifiers (table names, column names)
   */
  escapeIdentifier(identifier) {
    // Allow only alphanumeric characters, underscores, and dots
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(identifier)) {
      throw new ValidationError(`Invalid identifier: ${identifier}`);
    }
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Build and return the final query
   */
  build() {
    return {
      text: this.queryText,
      values: this.parameters
    };
  }
}

/**
 * Secure database operations for user management with caching
 */
const UserQueries = {
  /**
   * Find user by email (secure with caching)
   */
  async findByEmail(email) {
    const cacheKey = `user:email:${email.toLowerCase()}`;

    // Try cache first
    const cachedUser = await cacheService.get(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    const queryText = `
      SELECT id, email, password_hash, email_verified, first_name, last_name,
             created_at, updated_at, failed_login_attempts, account_locked_until,
             two_factor_enabled, last_login_at
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `;

    try {
      const result = await performanceService.trackQuery(queryText, [email.toLowerCase()], async () => {
        return await query(queryText, [email.toLowerCase()]);
      });

      const user = result.rows[0] || null;

      // Cache user data for 5 minutes (shorter TTL for auth data)
      if (user) {
        await cacheService.set(cacheKey, user, 300);
      }

      return user;
    } catch (error) {
      throw DatabaseError.fromDatabaseError(error);
    }
  },

  /**
   * Find user by ID (secure)
   */
  async findById(userId) {
    const queryText = `
      SELECT id, email, first_name, last_name, email_verified, 
             created_at, updated_at, business_name, phone,
             onboarding_completed, preferences
      FROM users 
      WHERE id = $1 AND deleted_at IS NULL
    `;

    try {
      const result = await query(queryText, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw DatabaseError.fromDatabaseError(error);
    }
  },

  /**
   * Create new user (secure)
   */
  async create(userData) {
    const queryText = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, 
        business_name, phone, email_verified, created_at, updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, email, first_name, last_name, created_at
    `;

    const values = [
      userData.email.toLowerCase(),
      userData.passwordHash,
      userData.firstName,
      userData.lastName,
      userData.businessName || null,
      userData.phone || null,
      userData.emailVerified || false
    ];

    try {
      const result = await query(queryText, values);
      return result.rows[0];
    } catch (error) {
      throw DatabaseError.fromDatabaseError(error);
    }
  },

  /**
   * Update user profile (secure)
   */
  async updateProfile(userId, updates) {
    const allowedFields = ['first_name', 'last_name', 'business_name', 'phone', 'preferences'];
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic update query with only allowed fields
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${++paramCount}`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = $${++paramCount}`);
    values.push(new Date());

    // Add user ID for WHERE clause
    values.push(userId);

    const queryText = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount} AND deleted_at IS NULL
      RETURNING id, email, first_name, last_name, business_name, phone, updated_at
    `;

    try {
      const result = await query(queryText, values);
      return result.rows[0] || null;
    } catch (error) {
      throw DatabaseError.fromDatabaseError(error);
    }
  },

  /**
   * Update login tracking (secure)
   */
  async updateLoginTracking(userId, success = true, ipAddress = null) {
    const queryText = success
      ? `
      UPDATE users 
      SET last_login_at = NOW(), 
          failed_login_attempts = 0,
          account_locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1
    `
      : `
      UPDATE users 
      SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
          account_locked_until = CASE 
            WHEN COALESCE(failed_login_attempts, 0) + 1 >= $2 
            THEN NOW() + INTERVAL '15 minutes'
            ELSE account_locked_until
          END,
          updated_at = NOW()
      WHERE id = $1
    `;

    const values = success ? [userId] : [userId, 5]; // 5 max failed attempts

    try {
      await query(queryText, values);

      // Log security event
      if (!success) {
        await this.logSecurityEvent(userId, 'failed_login_attempt', { ipAddress });
      }
    } catch (error) {
      throw DatabaseError.fromDatabaseError(error);
    }
  },

  /**
   * Log security events (secure)
   */
  async logSecurityEvent(userId, eventType, details = {}) {
    const queryText = `
      INSERT INTO security_audit_log (
        user_id, event_type, event_details, ip_address, user_agent, created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    const values = [userId, eventType, JSON.stringify(details), details.ipAddress || null, details.userAgent || null];

    try {
      await query(queryText, values);
    } catch (error) {
      // Don't throw on audit log failures, just log the error
      console.error('Failed to log security event:', error);
    }
  }
};

/**
 * Secure database operations for authentication
 */
const AuthQueries = {
  /**
   * Store password reset token (secure)
   */
  async storePasswordResetToken(userId, token, expiresAt) {
    const queryText = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at,
        used = false,
        created_at = NOW()
      RETURNING id
    `;

    try {
      const result = await query(queryText, [userId, token, expiresAt]);
      return result.rows[0];
    } catch (error) {
      throw DatabaseError.fromDatabaseError(error);
    }
  },

  /**
   * Verify password reset token (secure)
   */
  async verifyPasswordResetToken(token) {
    const queryText = `
      SELECT prt.id, prt.user_id, u.email
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1 
        AND prt.expires_at > NOW()
        AND prt.used = false
        AND u.deleted_at IS NULL
    `;

    try {
      const result = await query(queryText, [token]);
      return result.rows[0] || null;
    } catch (error) {
      throw DatabaseError.fromDatabaseError(error);
    }
  },

  /**
   * Use password reset token (secure)
   */
  async usePasswordResetToken(tokenId, newPasswordHash) {
    return await transaction(async client => {
      // Mark token as used
      await client.query('UPDATE password_reset_tokens SET used = true, used_at = NOW() WHERE id = $1', [tokenId]);

      // Update user password
      const result = await client.query(
        `UPDATE users 
         SET password_hash = $1, 
             last_password_reset = NOW(),
             failed_login_attempts = 0,
             account_locked_until = NULL,
             updated_at = NOW()
         WHERE id = (SELECT user_id FROM password_reset_tokens WHERE id = $2)
         RETURNING id, email`,
        [newPasswordHash, tokenId]
      );

      return result.rows[0];
    });
  }
};

/**
 * Query performance monitoring
 */
const QueryMonitor = {
  /**
   * Log slow queries for optimization
   */
  logSlowQuery(queryText, duration, params = []) {
    if (duration > 1000) {
      // Log queries taking more than 1 second
      console.warn(`🐌 Slow Query (${duration}ms):`, {
        query: queryText.substring(0, 200),
        params: params.length,
        duration
      });
    }
  },

  /**
   * Validate query parameters
   */
  validateParams(params) {
    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      // Check for potential SQL injection patterns
      if (typeof param === 'string') {
        const suspiciousPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
          /(--|\/\*|\*\/)/,
          /(\bOR\b.*=.*\bOR\b)/i,
          /(\bAND\b.*=.*\bAND\b)/i
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(param)) {
            throw new ValidationError(`Suspicious parameter detected: ${param.substring(0, 50)}`);
          }
        }
      }
    }
  }
};

module.exports = {
  SecureQueryBuilder,
  UserQueries,
  AuthQueries,
  QueryMonitor
};
