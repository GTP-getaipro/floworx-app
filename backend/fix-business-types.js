const { query } = require('./database/unified-connection');

async function createBusinessTypesTable() {
  try {
    console.log('🔧 Creating business_types table...');

    // Create business_types table
    await query(`
      CREATE TABLE IF NOT EXISTS business_types (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          default_categories JSONB DEFAULT '[]'::jsonb,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('✅ Business types table created');

    // Insert default business types
    console.log('📝 Inserting default business types...');
    
    await query(`
      INSERT INTO business_types (name, slug, description, default_categories, is_active) VALUES
      ('Hot Tub & Spa Services', 'hot-tub-spa', 'Professional hot tub and spa maintenance, repair, and installation services', 
       '["Service Requests", "Maintenance", "Repairs", "Installation", "Parts Orders", "Customer Support"]'::jsonb, true),
      ('Pool Services', 'pool-services', 'Swimming pool maintenance, cleaning, and repair services',
       '["Pool Cleaning", "Chemical Balancing", "Equipment Repair", "Pool Opening/Closing", "Customer Inquiries"]'::jsonb, true),
      ('HVAC Services', 'hvac-services', 'Heating, ventilation, and air conditioning services',
       '["Service Calls", "Maintenance", "Installation", "Emergency Repairs", "Customer Support"]'::jsonb, true),
      ('General Contractor', 'general-contractor', 'General construction and contracting services',
       '["Project Inquiries", "Estimates", "Scheduling", "Material Orders", "Customer Communication"]'::jsonb, true),
      ('Other Service Business', 'other-service', 'Other professional service businesses',
       '["Customer Inquiries", "Service Requests", "Scheduling", "Follow-up", "Support"]'::jsonb, true)
      ON CONFLICT (slug) DO NOTHING
    `);

    console.log('✅ Default business types inserted');

    // Add business_type_id to users table
    console.log('🔗 Adding business_type_id to users table...');
    
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS business_type_id INTEGER REFERENCES business_types(id)
    `);

    console.log('✅ Users table updated');

    // Create indexes
    console.log('📊 Creating indexes...');
    
    await query(`CREATE INDEX IF NOT EXISTS idx_users_business_type_id ON users(business_type_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_business_types_slug ON business_types(slug)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_business_types_is_active ON business_types(is_active)`);

    console.log('✅ Indexes created');

    // Verify the table was created successfully
    const result = await query('SELECT COUNT(*) as count FROM business_types');
    console.log(`✅ Business types table ready with ${result.rows[0].count} entries`);

    // Show the business types
    const businessTypes = await query('SELECT id, name, slug FROM business_types ORDER BY name');
    console.log('📋 Available business types:');
    businessTypes.rows.forEach(bt => {
      console.log(`  - ${bt.name} (${bt.slug})`);
    });

    console.log('🎉 Business types setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up business types:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createBusinessTypesTable();
