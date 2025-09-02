#!/usr/bin/env node

/**
 * Test Database Seeding Script
 * Seeds test database with required data for test execution
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedTestDatabase() {
  console.log('🌱 Seeding test database...');
  
  try {
    // Check if business_types table exists and has data
    const { data: existingBusinessTypes, error: btError } = await supabase
      .from('business_types')
      .select('*')
      .eq('slug', 'hot-tub-spa');
    
    if (btError) {
      if (btError.code === 'PGRST116') {
        console.log('⚠️ Business types table not found - skipping business type seeding');
      } else {
        console.error('❌ Error checking business types:', btError.message);
      }
    } else if (!existingBusinessTypes || existingBusinessTypes.length === 0) {
      console.log('📝 Seeding business types...');
      
      // Seed Hot Tub & Spa business type
      const { error: seedError } = await supabase
        .from('business_types')
        .insert({
          name: 'Hot Tub & Spa',
          description: 'Email automation for hot tub dealers, service companies, and spa retailers',
          slug: 'hot-tub-spa',
          is_active: true,
          sort_order: 1,
          default_categories: [
            {
              name: 'Service Calls',
              description: 'Emergency repairs and maintenance requests',
              priority: 'high'
            },
            {
              name: 'Sales Inquiries',
              description: 'New customer quotes and product information',
              priority: 'medium'
            },
            {
              name: 'Parts Orders',
              description: 'Replacement parts and accessories',
              priority: 'medium'
            },
            {
              name: 'Warranty Claims',
              description: 'Product warranty and support issues',
              priority: 'high'
            }
          ],
          workflow_template_id: 'floworx-hot-tub-automation-v1'
        });
      
      if (seedError) {
        console.error('❌ Failed to seed business types:', seedError.message);
      } else {
        console.log('✅ Business types seeded successfully');
      }
    } else {
      console.log('✅ Business types already exist');
    }
    
    // Clean up any existing test users
    const testEmails = [
      'test@floworx-test.com',
      'user-with-business@floworx-test.com',
      'unverified@floworx-test.com'
    ];
    
    for (const email of testEmails) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('email', email);
      
      // Ignore errors - user might not exist
    }
    
    console.log('🧹 Cleaned up existing test users');
    console.log('✅ Test database seeding completed');
    
  } catch (error) {
    console.error('❌ Test database seeding failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seedTestDatabase();
}

module.exports = { seedTestDatabase };
