/**
 * Database Schema Validation and Migration Script
 * Validates and creates required tables, indexes, and constraints for production
 */

const { Pool } = require('pg');
const crypto = require('crypto');

class DatabaseSchemaValidator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
        require: true
      } : false
    });

    this.requiredTables = [
      'users',
      'user_configurations', 
      'onboarding_progress',
      'credentials',
      'workflows',
      'workflow_executions',
      'audit_logs',
      'backup_config'
    ];

    this.requiredIndexes = [
      { table: 'users', column: 'email', unique: true },
      { table: 'users', column: 'created_at' },
      { table: 'user_configurations', column: 'user_id' },
      { table: 'onboarding_progress', column: 'user_id', unique: true },
      { table: 'credentials', column: 'user_id' },
      { table: 'credentials', columns: ['user_id', 'service_name'], unique: true },
      { table: 'workflows', column: 'user_id' },
      { table: 'workflow_executions', column: 'workflow_id' },
      { table: 'workflow_executions', column: 'created_at' },
      { table: 'audit_logs', column: 'user_id' },
      { table: 'audit_logs', column: 'created_at' }
    ];
  }

  /**
   * Validate complete database schema
   */
  async validateSchema() {
    console.log('🔍 Starting database schema validation...');
    
    try {
      const client = await this.pool.connect();
      
      const results = {
        tables: await this.validateTables(client),
        indexes: await this.validateIndexes(client),
        constraints: await this.validateConstraints(client),
        permissions: await this.validatePermissions(client)
      };

      client.release();
      
      const allValid = Object.values(results).every(result => result.valid);
      
      console.log('\n📊 SCHEMA VALIDATION RESULTS:');
      console.log('=' * 50);
      console.log(`Tables: ${results.tables.valid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`Indexes: ${results.indexes.valid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`Constraints: ${results.constraints.valid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`Permissions: ${results.permissions.valid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`\nOverall: ${allValid ? '✅ SCHEMA VALID' : '❌ SCHEMA NEEDS FIXES'}`);
      
      return { valid: allValid, results };
    } catch (error) {
      console.error('❌ Schema validation failed:', error.message);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate required tables exist
   */
  async validateTables(client) {
    console.log('🔧 Validating tables...');
    
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableNames = existingTables.rows.map(row => row.table_name);
    const missingTables = this.requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`⚠️ Missing tables: ${missingTables.join(', ')}`);
      return { valid: false, missing: missingTables };
    }
    
    console.log('✅ All required tables exist');
    return { valid: true, tables: tableNames };
  }

  /**
   * Validate required indexes exist
   */
  async validateIndexes(client) {
    console.log('🔧 Validating indexes...');
    
    const existingIndexes = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    
    const missingIndexes = [];
    
    for (const requiredIndex of this.requiredIndexes) {
      const indexExists = existingIndexes.rows.some(index => {
        if (requiredIndex.columns) {
          // Multi-column index
          return index.tablename === requiredIndex.table &&
                 requiredIndex.columns.every(col => index.indexdef.includes(col));
        } else {
          // Single column index
          return index.tablename === requiredIndex.table &&
                 index.indexdef.includes(requiredIndex.column);
        }
      });
      
      if (!indexExists) {
        missingIndexes.push(requiredIndex);
      }
    }
    
    if (missingIndexes.length > 0) {
      console.log(`⚠️ Missing indexes: ${missingIndexes.length}`);
      return { valid: false, missing: missingIndexes };
    }
    
    console.log('✅ All required indexes exist');
    return { valid: true };
  }

  /**
   * Validate database constraints
   */
  async validateConstraints(client) {
    console.log('🔧 Validating constraints...');
    
    const constraints = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
    `);
    
    const requiredConstraints = [
      { table: 'users', column: 'email', type: 'UNIQUE' },
      { table: 'credentials', columns: ['user_id', 'service_name'], type: 'UNIQUE' },
      { table: 'credentials', column: 'user_id', type: 'FOREIGN KEY', references: 'users(id)' },
      { table: 'onboarding_progress', column: 'user_id', type: 'FOREIGN KEY', references: 'users(id)' },
      { table: 'user_configurations', column: 'user_id', type: 'FOREIGN KEY', references: 'users(id)' }
    ];
    
    const missingConstraints = [];
    
    for (const required of requiredConstraints) {
      const constraintExists = constraints.rows.some(constraint => {
        return constraint.table_name === required.table &&
               constraint.constraint_type === required.type &&
               (required.column ? constraint.column_name === required.column : true);
      });
      
      if (!constraintExists) {
        missingConstraints.push(required);
      }
    }
    
    if (missingConstraints.length > 0) {
      console.log(`⚠️ Missing constraints: ${missingConstraints.length}`);
      return { valid: false, missing: missingConstraints };
    }
    
    console.log('✅ All required constraints exist');
    return { valid: true };
  }

  /**
   * Validate database permissions
   */
  async validatePermissions(client) {
    console.log('🔧 Validating permissions...');
    
    try {
      // Test basic operations
      await client.query('SELECT 1');
      await client.query('SELECT COUNT(*) FROM users');
      
      console.log('✅ Database permissions validated');
      return { valid: true };
    } catch (error) {
      console.log(`⚠️ Permission validation failed: ${error.message}`);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Create missing tables with proper structure
   */
  async createMissingTables(client, missingTables) {
    console.log('🔧 Creating missing tables...');
    
    const tableDefinitions = {
      users: `
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          company_name VARCHAR(255),
          business_type VARCHAR(100),
          phone VARCHAR(20),
          email_verified BOOLEAN DEFAULT false,
          onboarding_completed BOOLEAN DEFAULT false,
          trial_started_at TIMESTAMPTZ,
          trial_ends_at TIMESTAMPTZ,
          subscription_status VARCHAR(50) DEFAULT 'trial',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      
      user_configurations: `
        CREATE TABLE user_configurations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email_provider VARCHAR(50),
          business_type VARCHAR(100),
          configuration_data JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `,
      
      onboarding_progress: `
        CREATE TABLE onboarding_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          current_step VARCHAR(50) NOT NULL DEFAULT 'welcome',
          completed_steps TEXT[] DEFAULT '{}',
          step_data JSONB DEFAULT '{}',
          google_connected BOOLEAN DEFAULT false,
          workflow_deployed BOOLEAN DEFAULT false,
          onboarding_completed BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `,
      
      credentials: `
        CREATE TABLE credentials (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          service_name VARCHAR(50) NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          expiry_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, service_name)
        );
      `,
      
      workflows: `
        CREATE TABLE workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          n8n_workflow_id VARCHAR(100),
          status VARCHAR(50) DEFAULT 'inactive',
          configuration JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      
      workflow_executions: `
        CREATE TABLE workflow_executions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          status VARCHAR(50) NOT NULL,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          error_message TEXT,
          execution_data JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      
      audit_logs: `
        CREATE TABLE audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50),
          resource_id UUID,
          details JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    };

    for (const tableName of missingTables) {
      if (tableDefinitions[tableName]) {
        try {
          await client.query(tableDefinitions[tableName]);
          console.log(`✅ Created table: ${tableName}`);
        } catch (error) {
          console.error(`❌ Failed to create table ${tableName}:`, error.message);
        }
      }
    }
  }

  /**
   * Create missing indexes
   */
  async createMissingIndexes(client, missingIndexes) {
    console.log('🔧 Creating missing indexes...');
    
    for (const index of missingIndexes) {
      try {
        let indexName, indexSQL;
        
        if (index.columns) {
          // Multi-column index
          indexName = `idx_${index.table}_${index.columns.join('_')}`;
          const uniqueClause = index.unique ? 'UNIQUE' : '';
          indexSQL = `CREATE ${uniqueClause} INDEX ${indexName} ON ${index.table} (${index.columns.join(', ')})`;
        } else {
          // Single column index
          indexName = `idx_${index.table}_${index.column}`;
          const uniqueClause = index.unique ? 'UNIQUE' : '';
          indexSQL = `CREATE ${uniqueClause} INDEX ${indexName} ON ${index.table} (${index.column})`;
        }
        
        await client.query(indexSQL);
        console.log(`✅ Created index: ${indexName}`);
      } catch (error) {
        console.error(`❌ Failed to create index:`, error.message);
      }
    }
  }

  /**
   * Run complete schema setup
   */
  async setupSchema() {
    console.log('🚀 Starting database schema setup...');
    
    try {
      const validation = await this.validateSchema();
      
      if (validation.valid) {
        console.log('✅ Database schema is already valid!');
        return { success: true, message: 'Schema already valid' };
      }
      
      const client = await this.pool.connect();
      
      // Create missing tables
      if (validation.results.tables.missing) {
        await this.createMissingTables(client, validation.results.tables.missing);
      }
      
      // Create missing indexes
      if (validation.results.indexes.missing) {
        await this.createMissingIndexes(client, validation.results.indexes.missing);
      }
      
      client.release();
      
      // Re-validate
      const finalValidation = await this.validateSchema();
      
      console.log('\n🎉 Database schema setup completed!');
      return { 
        success: finalValidation.valid, 
        message: finalValidation.valid ? 'Schema setup successful' : 'Schema setup partially completed'
      };
      
    } catch (error) {
      console.error('❌ Schema setup failed:', error.message);
      return { success: false, error: error.message };
    } finally {
      await this.pool.end();
    }
  }
}

module.exports = DatabaseSchemaValidator;

// Run setup if called directly
if (require.main === module) {
  const validator = new DatabaseSchemaValidator();
  validator.setupSchema()
    .then(result => {
      console.log('\n📊 Final Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}
