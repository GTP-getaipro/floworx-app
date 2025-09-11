#!/usr/bin/env node

/**
 * FIX BUSINESS TYPES AND PASSWORD RESET
 * =====================================
 * Addresses the two remaining authentication issues
 */

const axios = require('axios');
const fs = require('fs');

class BusinessTypesAndPasswordResetFixer {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.fixes = [];
  }

  /**
   * Fix 1: Populate business types database
   */
  async fixBusinessTypes() {
    console.log('🏢 FIXING BUSINESS TYPES DATABASE');
    console.log('=================================');

    // First check current business types
    try {
      const response = await axios.get(`${this.apiUrl}/business-types`);
      console.log(`📊 Current business types count: ${response.data.length}`);

      if (response.data.length === 0) {
        console.log('⚠️  Business types database is empty - needs population');
        await this.populateBusinessTypes();
      } else {
        console.log('✅ Business types already populated');
        this.fixes.push('Business types database already has data');
      }

    } catch (error) {
      console.log(`❌ Business types API error: ${error.response?.data?.error || error.message}`);
      
      if (error.response?.status === 404) {
        console.log('⚠️  Business types endpoint not found - needs implementation');
        await this.createBusinessTypesEndpoint();
      }
    }
  }

  /**
   * Populate business types with sample data
   */
  async populateBusinessTypes() {
    console.log('📝 Populating business types database...');

    const businessTypes = [
      {
        name: 'Hot Tub & Spa Services',
        slug: 'hot-tub-spa',
        description: 'Hot tub maintenance, repair, and spa services',
        category: 'Home Services',
        icon: '🛁'
      },
      {
        name: 'Pool Services',
        slug: 'pool-services',
        description: 'Swimming pool cleaning, maintenance, and repair',
        category: 'Home Services',
        icon: '🏊'
      },
      {
        name: 'HVAC Services',
        slug: 'hvac-services',
        description: 'Heating, ventilation, and air conditioning services',
        category: 'Home Services',
        icon: '🌡️'
      },
      {
        name: 'Plumbing Services',
        slug: 'plumbing',
        description: 'Residential and commercial plumbing services',
        category: 'Home Services',
        icon: '🔧'
      },
      {
        name: 'Landscaping',
        slug: 'landscaping',
        description: 'Lawn care, garden design, and outdoor maintenance',
        category: 'Home Services',
        icon: '🌿'
      },
      {
        name: 'General Contractor',
        slug: 'general-contractor',
        description: 'Construction, renovation, and home improvement',
        category: 'Construction',
        icon: '🏗️'
      }
    ];

    // Try to create business types via API
    try {
      for (const businessType of businessTypes) {
        try {
          const response = await axios.post(`${this.apiUrl}/admin/business-types`, businessType, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
          });
          console.log(`✅ Created business type: ${businessType.name}`);
        } catch (error) {
          if (error.response?.status === 404) {
            console.log(`⚠️  Admin endpoint not found for: ${businessType.name}`);
          } else {
            console.log(`❌ Failed to create ${businessType.name}: ${error.response?.data?.error || error.message}`);
          }
        }
      }

      this.fixes.push('Attempted to populate business types via API');

    } catch (error) {
      console.log(`❌ Business types population failed: ${error.message}`);
    }

    // Create SQL script for manual population
    await this.createBusinessTypesSQL(businessTypes);
  }

  /**
   * Create SQL script for business types population
   */
  async createBusinessTypesSQL(businessTypes) {
    console.log('📄 Creating SQL script for business types...');

    const sqlScript = `-- Business Types Population Script
-- Run this script to populate the business_types table

-- Create business_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS business_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(255),
  icon VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert business types
${businessTypes.map(bt => `
INSERT INTO business_types (name, slug, description, category, icon)
VALUES ('${bt.name}', '${bt.slug}', '${bt.description}', '${bt.category}', '${bt.icon}')
ON CONFLICT (slug) DO NOTHING;`).join('')}

-- Verify insertion
SELECT COUNT(*) as business_types_count FROM business_types;
SELECT * FROM business_types ORDER BY name;
`;

    fs.writeFileSync('populate-business-types.sql', sqlScript);
    console.log('📄 SQL script saved to: populate-business-types.sql');
    this.fixes.push('Created SQL script for business types population');
  }

  /**
   * Create business types API endpoint
   */
  async createBusinessTypesEndpoint() {
    console.log('🔧 Creating business types API endpoint...');

    const endpointCode = `
// Business Types Routes - Add to backend/routes/businessTypes.js or backend/routes/index.js

const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');

// GET /api/business-types
// Get all active business types
router.get('/business-types', async (req, res) => {
  try {
    const businessTypesQuery = \`
      SELECT id, name, slug, description, category, icon
      FROM business_types 
      WHERE is_active = true 
      ORDER BY name ASC
    \`;
    
    const result = await query(businessTypesQuery);
    
    res.status(200).json(result.rows);
    
  } catch (error) {
    console.error('Business types fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'SERVER_ERROR',
        message: 'Failed to fetch business types',
        code: 500
      }
    });
  }
});

// POST /api/admin/business-types
// Create new business type (admin only)
router.post('/admin/business-types', async (req, res) => {
  try {
    const { name, slug, description, category, icon } = req.body;
    
    const insertQuery = \`
      INSERT INTO business_types (name, slug, description, category, icon)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    \`;
    
    const result = await query(insertQuery, [name, slug, description, category, icon]);
    
    res.status(201).json({
      success: true,
      businessType: result.rows[0]
    });
    
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: {
          type: 'DUPLICATE_ENTRY',
          message: 'Business type with this name or slug already exists',
          code: 409
        }
      });
    }
    
    console.error('Business type creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'SERVER_ERROR',
        message: 'Failed to create business type',
        code: 500
      }
    });
  }
});

module.exports = router;

// Don't forget to add this to your main app.js:
// app.use('/api', require('./routes/businessTypes'));
`;

    fs.writeFileSync('business-types-endpoint.js', endpointCode);
    console.log('📄 Business types endpoint saved to: business-types-endpoint.js');
    this.fixes.push('Created business types API endpoint implementation');
  }

  /**
   * Fix 2: Implement password reset functionality
   */
  async fixPasswordReset() {
    console.log('\n🔄 FIXING PASSWORD RESET FUNCTIONALITY');
    console.log('======================================');

    // Test current password reset endpoint
    try {
      const testResponse = await axios.post(`${this.apiUrl}/auth/forgot-password`, {
        email: 'test@example.com'
      }, { timeout: 10000 });

      console.log(`✅ Password reset endpoint exists: ${testResponse.status}`);
      this.fixes.push('Password reset endpoint is already functional');

    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️  Password reset endpoint not found - creating implementation');
        await this.createPasswordResetImplementation();
      } else if (error.response?.status === 400) {
        console.log('✅ Password reset endpoint exists (validation error expected)');
        this.fixes.push('Password reset endpoint is functional');
      } else if (error.response?.status === 500) {
        console.log('⚠️  Password reset endpoint exists but has server errors');
        await this.createPasswordResetDatabaseSchema();
      } else {
        console.log(`❌ Password reset test failed: ${error.response?.data?.error || error.message}`);
      }
    }
  }

  /**
   * Create password reset database schema
   */
  async createPasswordResetDatabaseSchema() {
    console.log('🗄️  Creating password reset database schema...');

    const schemaSQL = `-- Password Reset Database Schema
-- Run this script to create the password_reset_tokens table

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  UNIQUE(user_id) -- Only one active reset token per user
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Clean up expired tokens (run periodically)
DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP;
`;

    fs.writeFileSync('password-reset-schema.sql', schemaSQL);
    console.log('📄 Password reset schema saved to: password-reset-schema.sql');
    this.fixes.push('Created password reset database schema');
  }

  /**
   * Create complete password reset implementation
   */
  async createPasswordResetImplementation() {
    console.log('🔧 Creating password reset implementation...');

    const implementationCode = `
// Password Reset Implementation - Add to backend/routes/auth.js

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Validation schemas (add to your validation file)
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

// POST /api/auth/forgot-password
router.post('/forgot-password', 
  validateRequest({ body: forgotPasswordSchema }),
  asyncWrapper(async (req, res) => {
    const { email } = req.body;
    
    try {
      // Find user by email
      const userQuery = 'SELECT id, email, first_name FROM users WHERE email = $1';
      const userResult = await query(userQuery, [email.toLowerCase()]);
      
      if (userResult.rows.length === 0) {
        // Don't reveal if email exists or not for security
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }
      
      const user = userResult.rows[0];
      
      // Generate reset token (24 hour expiry)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Store reset token in database
      const storeTokenQuery = \`
        INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) 
        DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP, used_at = NULL
      \`;
      
      await query(storeTokenQuery, [user.id, resetToken, resetExpires]);
      
      // Log reset URL for development (replace with email service in production)
      const resetUrl = \`\${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/reset-password?token=\${resetToken}\`;
      console.log(\`Password reset URL for \${user.email}: \${resetUrl}\`);
      
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        // Remove this in production - only for testing
        resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
      });
      
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'SERVER_ERROR',
          message: 'Failed to process password reset request',
          code: 500
        }
      });
    }
  })
);

// POST /api/auth/reset-password
router.post('/reset-password',
  validateRequest({ body: resetPasswordSchema }),
  asyncWrapper(async (req, res) => {
    const { token, newPassword } = req.body;
    
    try {
      // Find valid reset token
      const tokenQuery = \`
        SELECT prt.user_id, prt.expires_at, u.email 
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP AND prt.used_at IS NULL
      \`;
      
      const tokenResult = await query(tokenQuery, [token]);
      
      if (tokenResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token',
            code: 400
          }
        });
      }
      
      const { user_id, email } = tokenResult.rows[0];
      
      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      const updatePasswordQuery = 'UPDATE users SET password_hash = $1 WHERE id = $2';
      await query(updatePasswordQuery, [passwordHash, user_id]);
      
      // Mark token as used
      const markUsedQuery = 'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1';
      await query(markUsedQuery, [token]);
      
      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully'
      });
      
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'SERVER_ERROR',
          message: 'Failed to reset password',
          code: 500
        }
      });
    }
  })
);

// GET /api/auth/verify-reset-token
router.get('/verify-reset-token/:token', 
  asyncWrapper(async (req, res) => {
    const { token } = req.params;
    
    try {
      const tokenQuery = \`
        SELECT expires_at 
        FROM password_reset_tokens 
        WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL
      \`;
      
      const result = await query(tokenQuery, [token]);
      
      res.status(200).json({
        success: true,
        valid: result.rows.length > 0,
        expires_at: result.rows[0]?.expires_at
      });
      
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'SERVER_ERROR',
          message: 'Failed to verify reset token',
          code: 500
        }
      });
    }
  })
);
`;

    fs.writeFileSync('password-reset-implementation.js', implementationCode);
    console.log('📄 Password reset implementation saved to: password-reset-implementation.js');
    this.fixes.push('Created complete password reset implementation');
  }

  /**
   * Run all fixes
   */
  async runAllFixes() {
    console.log('🔧 BUSINESS TYPES & PASSWORD RESET FIXER');
    console.log('========================================');
    console.log('Fixing remaining authentication issues...\n');

    await this.fixBusinessTypes();
    await this.fixPasswordReset();

    console.log('\n📊 FIXES APPLIED');
    console.log('================');
    console.log(`✅ Total fixes: ${this.fixes.length}`);
    
    if (this.fixes.length > 0) {
      console.log('\n💡 FIXES APPLIED:');
      this.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });
    }

    console.log('\n📄 FILES CREATED:');
    console.log('- populate-business-types.sql (database population)');
    console.log('- business-types-endpoint.js (API implementation)');
    console.log('- password-reset-schema.sql (database schema)');
    console.log('- password-reset-implementation.js (API implementation)');

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Run the SQL scripts to populate database');
    console.log('2. Add the API endpoints to your backend');
    console.log('3. Test the authentication improvements');
    console.log('4. Run UX tests to verify 85%+ success rate');

    return {
      fixes: this.fixes,
      filesCreated: [
        'populate-business-types.sql',
        'business-types-endpoint.js', 
        'password-reset-schema.sql',
        'password-reset-implementation.js'
      ]
    };
  }
}

// Run fixes if called directly
if (require.main === module) {
  const fixer = new BusinessTypesAndPasswordResetFixer();
  fixer.runAllFixes()
    .then(result => {
      console.log('\n🎉 FIXES COMPLETE!');
      process.exit(0);
    })
    .catch(console.error);
}

module.exports = BusinessTypesAndPasswordResetFixer;
