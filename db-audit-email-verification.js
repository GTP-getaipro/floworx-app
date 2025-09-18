#!/usr/bin/env node

/**
 * Database Audit Script for Email Verification System
 * 
 * Validates the database structure and data integrity for email verification
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error('Warning: Could not load .env file:', error.message);
  }
}

class DatabaseAuditor {
  constructor() {
    this.client = null;
    this.auditResults = [];
  }

  async connect() {
    loadEnvFile();
    
    this.client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await this.client.connect();
    console.log('✅ Connected to database for audit');
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('🔌 Disconnected from database');
    }
  }

  addAuditResult(category, test, passed, details, recommendation = null) {
    this.auditResults.push({
      category,
      test,
      passed,
      details,
      recommendation
    });
  }

  async auditTableStructure() {
    console.log('\n📋 AUDITING TABLE STRUCTURE');
    console.log('=' .repeat(50));

    // Check if users table exists
    const tableExists = await this.client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableExists.rows[0].exists) {
      this.addAuditResult('Structure', 'Users table exists', false, 'Users table not found', 'Create users table');
      return;
    }

    this.addAuditResult('Structure', 'Users table exists', true, 'Users table found');

    // Check all required columns
    const columns = await this.client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    const columnMap = {};
    columns.rows.forEach(col => {
      columnMap[col.column_name] = col;
    });

    // Required columns for email verification
    const requiredColumns = {
      'id': { type: 'uuid', nullable: 'NO' },
      'email': { type: 'character varying', nullable: 'NO' },
      'password_hash': { type: 'character varying', nullable: 'NO' },
      'first_name': { type: 'character varying', nullable: 'YES' },
      'last_name': { type: 'character varying', nullable: 'YES' },
      'email_verified': { type: 'boolean', nullable: 'NO' },
      'verification_token': { type: 'character varying', nullable: 'YES' },
      'verification_token_expires_at': { type: 'timestamp with time zone', nullable: 'YES' },
      'created_at': { type: 'timestamp with time zone', nullable: 'YES' },
      'updated_at': { type: 'timestamp with time zone', nullable: 'YES' }
    };

    console.log('\n📊 Column Analysis:');
    for (const [colName, requirements] of Object.entries(requiredColumns)) {
      const col = columnMap[colName];
      if (!col) {
        console.log(`   ❌ ${colName}: MISSING`);
        this.addAuditResult('Structure', `Column ${colName}`, false, 'Column missing', `Add column: ALTER TABLE users ADD COLUMN ${colName} ...`);
      } else {
        const typeMatch = col.data_type.includes(requirements.type) || requirements.type.includes(col.data_type);
        const nullableMatch = col.is_nullable === requirements.nullable;
        
        if (typeMatch && nullableMatch) {
          console.log(`   ✅ ${colName}: ${col.data_type} (nullable: ${col.is_nullable})`);
          this.addAuditResult('Structure', `Column ${colName}`, true, `Correct type and nullability`);
        } else {
          console.log(`   ⚠️  ${colName}: ${col.data_type} (nullable: ${col.is_nullable}) - Expected: ${requirements.type} (nullable: ${requirements.nullable})`);
          this.addAuditResult('Structure', `Column ${colName}`, false, `Type or nullability mismatch`, `Review column definition`);
        }
      }
    }
  }

  async auditIndexes() {
    console.log('\n🔍 AUDITING INDEXES');
    console.log('=' .repeat(50));

    const indexes = await this.client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND schemaname = 'public'
      ORDER BY indexname;
    `);

    const requiredIndexes = [
      'idx_users_email_verified',
      'idx_users_verification_token',
      'idx_users_verification_expires'
    ];

    const existingIndexes = indexes.rows.map(idx => idx.indexname);
    
    console.log('\n📊 Index Analysis:');
    for (const requiredIndex of requiredIndexes) {
      if (existingIndexes.includes(requiredIndex)) {
        console.log(`   ✅ ${requiredIndex}: EXISTS`);
        this.addAuditResult('Indexes', requiredIndex, true, 'Index exists');
      } else {
        console.log(`   ❌ ${requiredIndex}: MISSING`);
        this.addAuditResult('Indexes', requiredIndex, false, 'Index missing', 'Create index for performance');
      }
    }

    // Show all existing indexes
    console.log('\n📋 All existing indexes:');
    indexes.rows.forEach(idx => {
      console.log(`   • ${idx.indexname}`);
    });
  }

  async auditDataIntegrity() {
    console.log('\n🔍 AUDITING DATA INTEGRITY');
    console.log('=' .repeat(50));

    // Check for users with null email_verified
    const nullEmailVerified = await this.client.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE email_verified IS NULL;
    `);

    if (nullEmailVerified.rows[0].count > 0) {
      console.log(`   ❌ Found ${nullEmailVerified.rows[0].count} users with NULL email_verified`);
      this.addAuditResult('Data Integrity', 'email_verified not null', false, `${nullEmailVerified.rows[0].count} users have NULL email_verified`, 'Update users SET email_verified = false WHERE email_verified IS NULL');
    } else {
      console.log('   ✅ All users have email_verified set');
      this.addAuditResult('Data Integrity', 'email_verified not null', true, 'No NULL email_verified values');
    }

    // Check for orphaned verification tokens (expired)
    const expiredTokens = await this.client.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE verification_token IS NOT NULL 
      AND verification_token_expires_at < NOW();
    `);

    if (expiredTokens.rows[0].count > 0) {
      console.log(`   ⚠️  Found ${expiredTokens.rows[0].count} users with expired verification tokens`);
      this.addAuditResult('Data Integrity', 'Expired tokens cleanup', false, `${expiredTokens.rows[0].count} expired tokens`, 'Clean up expired tokens');
    } else {
      console.log('   ✅ No expired verification tokens found');
      this.addAuditResult('Data Integrity', 'Expired tokens cleanup', true, 'No expired tokens');
    }

    // Check email uniqueness
    const duplicateEmails = await this.client.query(`
      SELECT email, COUNT(*) as count 
      FROM users 
      GROUP BY email 
      HAVING COUNT(*) > 1;
    `);

    if (duplicateEmails.rows.length > 0) {
      console.log(`   ❌ Found ${duplicateEmails.rows.length} duplicate email addresses`);
      this.addAuditResult('Data Integrity', 'Email uniqueness', false, `${duplicateEmails.rows.length} duplicate emails`, 'Resolve duplicate emails');
    } else {
      console.log('   ✅ All email addresses are unique');
      this.addAuditResult('Data Integrity', 'Email uniqueness', true, 'No duplicate emails');
    }
  }

  async auditUserStats() {
    console.log('\n📊 USER STATISTICS');
    console.log('=' .repeat(50));

    // Total users
    const totalUsers = await this.client.query('SELECT COUNT(*) as count FROM users');
    console.log(`   📈 Total users: ${totalUsers.rows[0].count}`);

    // Verified vs unverified
    const verificationStats = await this.client.query(`
      SELECT 
        email_verified,
        COUNT(*) as count
      FROM users 
      GROUP BY email_verified
      ORDER BY email_verified;
    `);

    console.log('   📊 Verification status:');
    verificationStats.rows.forEach(stat => {
      const status = stat.email_verified ? 'Verified' : 'Unverified';
      console.log(`      • ${status}: ${stat.count}`);
    });

    // Users with pending verification tokens
    const pendingVerification = await this.client.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE verification_token IS NOT NULL 
      AND verification_token_expires_at > NOW();
    `);

    console.log(`   ⏳ Pending verification: ${pendingVerification.rows[0].count}`);

    // Recent registrations (last 24 hours)
    const recentRegistrations = await this.client.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at > NOW() - INTERVAL '24 hours';
    `);

    console.log(`   🆕 Recent registrations (24h): ${recentRegistrations.rows[0].count}`);
  }

  async generateReport() {
    console.log('\n📋 AUDIT REPORT SUMMARY');
    console.log('=' .repeat(60));

    const categories = {};
    this.auditResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { passed: 0, failed: 0, total: 0 };
      }
      categories[result.category].total++;
      if (result.passed) {
        categories[result.category].passed++;
      } else {
        categories[result.category].failed++;
      }
    });

    console.log('\n📊 CATEGORY SUMMARY:');
    for (const [category, stats] of Object.entries(categories)) {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      const status = stats.failed === 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${category}: ${stats.passed}/${stats.total} passed (${successRate}%)`);
    }

    console.log('\n❌ FAILED TESTS:');
    const failedTests = this.auditResults.filter(r => !r.passed);
    if (failedTests.length === 0) {
      console.log('   🎉 All tests passed!');
    } else {
      failedTests.forEach(test => {
        console.log(`   • ${test.category} - ${test.test}: ${test.details}`);
        if (test.recommendation) {
          console.log(`     💡 Recommendation: ${test.recommendation}`);
        }
      });
    }

    const totalPassed = this.auditResults.filter(r => r.passed).length;
    const totalTests = this.auditResults.length;
    const overallSuccess = ((totalPassed / totalTests) * 100).toFixed(1);

    console.log(`\n🎯 OVERALL SCORE: ${totalPassed}/${totalTests} (${overallSuccess}%)`);
    
    if (overallSuccess >= 90) {
      console.log('🎉 EXCELLENT: Email verification system is properly configured!');
    } else if (overallSuccess >= 75) {
      console.log('✅ GOOD: Minor issues found, but system should work');
    } else {
      console.log('⚠️  NEEDS ATTENTION: Significant issues found');
    }
  }

  async runFullAudit() {
    try {
      await this.connect();
      
      console.log('🔍 DATABASE AUDIT FOR EMAIL VERIFICATION SYSTEM');
      console.log('=' .repeat(60));
      console.log(`📅 Audit Date: ${new Date().toISOString()}`);
      console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

      await this.auditTableStructure();
      await this.auditIndexes();
      await this.auditDataIntegrity();
      await this.auditUserStats();
      await this.generateReport();

    } catch (error) {
      console.error('💥 Audit failed:', error.message);
      console.error('Stack:', error.stack);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new DatabaseAuditor();
  auditor.runFullAudit().catch(console.error);
}

module.exports = { DatabaseAuditor };
