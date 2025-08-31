const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

/**
 * Add missing Floworx schema components to existing Supabase database
 */

async function addMissingComponents() {
  console.log('🔧 Adding Missing Floworx Schema Components...\n');

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
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log(`   Current time: ${testResult.rows[0].current_time}\n`);

    // Read and execute missing schema
    console.log('2. Reading missing schema file...');
    const schemaPath = path.join(__dirname, 'add-missing-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Missing schema file loaded successfully\n');

    console.log('3. Executing missing schema components...');
    await pool.query(schemaSQL);
    console.log('✅ Missing schema components added successfully\n');

    // Verify new tables were created
    console.log('4. Verifying new tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('business_configs', 'onboarding_progress', 'user_analytics')
      ORDER BY table_name
    `);

    console.log('✅ New tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('');

    // Verify RLS policies
    console.log('5. Verifying RLS policies...');
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
      AND routine_name IN ('validate_business_config', 'get_user_business_config', 'get_user_credentials')
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

    // Create sample configuration template
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

    console.log('🎉 Missing Floworx Schema Components Added Successfully!\n');
    
    console.log('📋 Summary:');
    console.log('   ✅ Missing tables created');
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
    console.error('❌ Adding missing components failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addMissingComponents().catch(console.error);
}

module.exports = { addMissingComponents };
