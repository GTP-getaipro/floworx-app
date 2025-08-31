const { Pool } = require('pg');
require('dotenv').config();

/**
 * Check current Supabase database schema and identify missing components
 */

async function checkSupabaseSchema() {
  console.log('🔍 Checking Floworx Supabase Database Schema...\n');

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test connection
    console.log('1. Testing database connection...');
    const testResult = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful');
    console.log(`   Current time: ${testResult.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${testResult.rows[0].pg_version.split(' ')[0]}\n`);

    // Check existing tables
    console.log('2. Checking existing tables...');
    const tablesResult = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('✅ Existing tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name} (${row.column_count} columns)`);
    });
    console.log('');

    // Check for Floworx-specific tables
    const expectedTables = ['credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log('⚠️  Missing Floworx tables:');
      missingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log('');
    } else {
      console.log('✅ All Floworx tables exist\n');
    }

    // Check RLS policies
    console.log('3. Checking Row Level Security policies...');
    const rlsResult = await pool.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);

    if (rlsResult.rows.length > 0) {
      console.log('✅ RLS Policies found:');
      rlsResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}: ${row.policyname} (${row.cmd})`);
      });
      console.log('');
    } else {
      console.log('⚠️  No RLS policies found\n');
    }

    // Check functions
    console.log('4. Checking utility functions...');
    const functionsResult = await pool.query(`
      SELECT routine_name, routine_type, data_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('validate_business_config', 'get_user_business_config', 'get_user_credentials', 'update_updated_at_column')
      ORDER BY routine_name
    `);

    if (functionsResult.rows.length > 0) {
      console.log('✅ Functions found:');
      functionsResult.rows.forEach(row => {
        console.log(`   - ${row.routine_name} (${row.routine_type}) -> ${row.data_type}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No utility functions found\n');
    }

    // Check indexes
    console.log('5. Checking indexes...');
    const indexesResult = await pool.query(`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics')
      ORDER BY tablename, indexname
    `);

    if (indexesResult.rows.length > 0) {
      console.log('✅ Indexes found:');
      indexesResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}: ${row.indexname}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No custom indexes found\n');
    }

    // Test business config validation if function exists
    if (functionsResult.rows.some(row => row.routine_name === 'validate_business_config')) {
      console.log('6. Testing business config validation...');
      const validConfig = {
        business_name: "Test Company",
        contact_email: "test@example.com",
        email_categories: ["SALES", "SUPPORT"],
        gmail_label_mappings: {
          "SALES": "label_123",
          "SUPPORT": "label_456"
        }
      };

      try {
        const validationResult = await pool.query(
          'SELECT validate_business_config($1) as is_valid',
          [JSON.stringify(validConfig)]
        );

        if (validationResult.rows[0].is_valid) {
          console.log('✅ Business config validation working correctly\n');
        } else {
          console.log('❌ Business config validation failed\n');
        }
      } catch (error) {
        console.log('❌ Business config validation error:', error.message, '\n');
      }
    }

    // Check sample data
    console.log('7. Checking for sample data...');
    for (const table of expectedTables.filter(t => existingTables.includes(t))) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM public.${table}`);
      console.log(`   - ${table}: ${countResult.rows[0].count} records`);
    }
    console.log('');

    console.log('🎯 Schema Check Summary:');
    console.log(`   Tables: ${existingTables.filter(t => expectedTables.includes(t)).length}/${expectedTables.length} Floworx tables exist`);
    console.log(`   RLS Policies: ${rlsResult.rows.length} policies found`);
    console.log(`   Functions: ${functionsResult.rows.length} utility functions found`);
    console.log(`   Indexes: ${indexesResult.rows.length} custom indexes found`);
    console.log('');

    if (missingTables.length === 0 && rlsResult.rows.length > 0 && functionsResult.rows.length > 0) {
      console.log('✅ Floworx database schema is properly configured!');
    } else {
      console.log('⚠️  Database schema needs additional configuration');
      console.log('   Run the schema creation scripts to complete setup');
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await pool.end();
  }
}

// Run check if called directly
if (require.main === module) {
  checkSupabaseSchema().catch(console.error);
}

module.exports = { checkSupabaseSchema };
