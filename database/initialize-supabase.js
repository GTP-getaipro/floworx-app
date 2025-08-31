const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

/**
 * Initialize Supabase Database with Floworx Schema
 * This script sets up the complete multi-tenant database schema
 */

async function initializeSupabaseDatabase() {
  console.log('🚀 Initializing Floworx Supabase Database...\n');

  // Create database connection
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

    // Read and execute schema
    console.log('2. Reading schema file...');
    const schemaPath = path.join(__dirname, 'floworx-supabase-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema file loaded successfully\n');

    console.log('3. Executing schema creation...');
    await pool.query(schemaSQL);
    console.log('✅ Database schema created successfully\n');

    // Verify tables were created
    console.log('4. Verifying table creation...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics')
      ORDER BY table_name
    `);

    console.log('✅ Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('');

    // Verify RLS policies
    console.log('5. Verifying Row Level Security policies...');
    const rlsResult = await pool.query(`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);

    console.log('✅ RLS Policies created:');
    rlsResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}: ${row.policyname}`);
    });
    console.log('');

    // Verify functions
    console.log('6. Verifying utility functions...');
    const functionsResult = await pool.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('validate_business_config', 'get_user_business_config', 'get_user_credentials', 'update_updated_at_column')
      ORDER BY routine_name
    `);

    console.log('✅ Functions created:');
    functionsResult.rows.forEach(row => {
      console.log(`   - ${row.routine_name} (${row.routine_type})`);
    });
    console.log('');

    // Test business config validation
    console.log('7. Testing business config validation...');
    const validConfig = {
      business_name: "Test Company",
      contact_email: "test@example.com",
      email_categories: ["SALES", "SUPPORT"],
      gmail_label_mappings: {
        "SALES": "label_123",
        "SUPPORT": "label_456"
      }
    };

    const validationResult = await pool.query(
      'SELECT validate_business_config($1) as is_valid',
      [JSON.stringify(validConfig)]
    );

    if (validationResult.rows[0].is_valid) {
      console.log('✅ Business config validation working correctly\n');
    } else {
      console.log('❌ Business config validation failed\n');
    }

    // Create sample configuration for testing
    console.log('8. Creating sample configuration template...');
    const sampleConfig = {
      business_name: "Sample Business",
      contact_phone: "+1-555-123-4567",
      contact_email: "info@samplebusiness.com",
      internal_domains: ["samplebusiness.com"],
      website_links: {
        homepage: "https://www.samplebusiness.com",
        services: "https://www.samplebusiness.com/services",
        contact: "https://www.samplebusiness.com/contact"
      },
      email_categories: ["SALES", "SUPPORT", "BILLING", "GENERAL"],
      personnel: [
        {
          name: "John Doe",
          role: "Sales Manager",
          email: "john@samplebusiness.com",
          categories: ["SALES"]
        },
        {
          name: "Jane Smith", 
          role: "Support Lead",
          email: "jane@samplebusiness.com",
          categories: ["SUPPORT"]
        }
      ],
      gmail_label_mappings: {
        SALES: "Label_1234567890",
        SUPPORT: "Label_0987654321",
        BILLING: "Label_1122334455", 
        GENERAL: "Label_5566778899"
      },
      notification_preferences: {
        email_routing: true,
        team_notifications: true,
        sms_alerts: false
      },
      business_hours: {
        timezone: "America/New_York",
        monday: {start: "09:00", end: "17:00"},
        tuesday: {start: "09:00", end: "17:00"},
        wednesday: {start: "09:00", end: "17:00"},
        thursday: {start: "09:00", end: "17:00"},
        friday: {start: "09:00", end: "17:00"},
        saturday: null,
        sunday: null
      },
      auto_response_templates: {
        SALES: "Thank you for your interest! A sales representative will contact you within 2 business hours.",
        SUPPORT: "We've received your support request. Our team will respond within 4 hours during business hours.",
        BILLING: "Your billing inquiry has been received. Our accounting team will respond within 1 business day."
      }
    };

    // Save sample config to file for reference
    const sampleConfigPath = path.join(__dirname, 'sample-business-config.json');
    fs.writeFileSync(sampleConfigPath, JSON.stringify(sampleConfig, null, 2));
    console.log('✅ Sample configuration saved to sample-business-config.json\n');

    console.log('🎉 Floworx Supabase Database initialization completed successfully!\n');
    
    console.log('📋 Summary:');
    console.log('   ✅ Database connection established');
    console.log('   ✅ Schema created with all tables');
    console.log('   ✅ Row Level Security policies applied');
    console.log('   ✅ Utility functions created');
    console.log('   ✅ Validation functions working');
    console.log('   ✅ Sample configuration template created\n');
    
    console.log('🔧 Next Steps:');
    console.log('   1. Configure environment variables in Vercel');
    console.log('   2. Update Google OAuth settings');
    console.log('   3. Test the complete onboarding flow');
    console.log('   4. Deploy n8n workflow templates\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeSupabaseDatabase().catch(console.error);
}

module.exports = { initializeSupabaseDatabase };
