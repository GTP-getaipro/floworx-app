#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('   Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkExistingUsers() {
  console.log('🔍 CHECKING EXISTING USERS IN FLOWORX DATABASE');
  console.log('==============================================');
  
  try {
    // Check auth.users table (Supabase managed)
    console.log('\n1. Checking Supabase Auth Users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log(`❌ Error fetching auth users: ${authError.message}`);
    } else {
      console.log(`✅ Found ${authUsers.users.length} users in auth.users`);
      
      if (authUsers.users.length > 0) {
        console.log('\n📋 Auth Users:');
        authUsers.users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email}`);
          console.log(`      ID: ${user.id}`);
          console.log(`      Created: ${new Date(user.created_at).toLocaleDateString()}`);
          console.log(`      Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
          console.log(`      Last sign in: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}`);
          console.log('');
        });
      }
    }
    
    // Check public.users table (our extended user data)
    console.log('2. Checking Public Users Table...');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*');
    
    if (publicError) {
      console.log(`❌ Error fetching public users: ${publicError.message}`);
    } else {
      console.log(`✅ Found ${publicUsers.length} users in public.users`);
      
      if (publicUsers.length > 0) {
        console.log('\n📋 Public Users:');
        publicUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email}`);
          console.log(`      Name: ${user.first_name} ${user.last_name}`);
          console.log(`      Company: ${user.company_name || 'Not set'}`);
          console.log(`      Business Type: ${user.business_type || 'Not set'}`);
          console.log(`      Email Verified: ${user.email_verified ? 'Yes' : 'No'}`);
          console.log(`      Onboarding Complete: ${user.onboarding_completed ? 'Yes' : 'No'}`);
          console.log(`      Subscription: ${user.subscription_status}`);
          console.log(`      Created: ${new Date(user.created_at).toLocaleDateString()}`);
          console.log('');
        });
      }
    }
    
    // Check onboarding progress
    console.log('3. Checking Onboarding Progress...');
    const { data: onboardingData, error: onboardingError } = await supabase
      .from('onboarding_progress')
      .select('*');
    
    if (onboardingError) {
      console.log(`❌ Error fetching onboarding data: ${onboardingError.message}`);
    } else {
      console.log(`✅ Found ${onboardingData.length} onboarding records`);
      
      if (onboardingData.length > 0) {
        console.log('\n📋 Onboarding Progress:');
        onboardingData.forEach((progress, index) => {
          console.log(`   ${index + 1}. User ID: ${progress.user_id}`);
          console.log(`      Current Step: ${progress.current_step}`);
          console.log(`      Completed Steps: ${progress.completed_steps.join(', ')}`);
          console.log(`      Google Connected: ${progress.google_connected ? 'Yes' : 'No'}`);
          console.log(`      Workflow Deployed: ${progress.workflow_deployed ? 'Yes' : 'No'}`);
          console.log(`      Onboarding Complete: ${progress.onboarding_completed ? 'Yes' : 'No'}`);
          console.log('');
        });
      }
    }
    
    // Check business configs
    console.log('4. Checking Business Configurations...');
    const { data: businessConfigs, error: configError } = await supabase
      .from('business_configs')
      .select('*');
    
    if (configError) {
      console.log(`❌ Error fetching business configs: ${configError.message}`);
    } else {
      console.log(`✅ Found ${businessConfigs.length} business configurations`);
      
      if (businessConfigs.length > 0) {
        console.log('\n📋 Business Configurations:');
        businessConfigs.forEach((config, index) => {
          console.log(`   ${index + 1}. User ID: ${config.user_id}`);
          console.log(`      Version: ${config.version}`);
          console.log(`      Active: ${config.is_active ? 'Yes' : 'No'}`);
          console.log(`      Created: ${new Date(config.created_at).toLocaleDateString()}`);
          console.log(`      Config Preview: ${JSON.stringify(config.config_json).substring(0, 100)}...`);
          console.log('');
        });
      }
    }
    
    // Check credentials (OAuth tokens)
    console.log('5. Checking OAuth Credentials...');
    const { data: credentials, error: credError } = await supabase
      .from('credentials')
      .select('user_id, service_name, created_at, expiry_date');
    
    if (credError) {
      console.log(`❌ Error fetching credentials: ${credError.message}`);
    } else {
      console.log(`✅ Found ${credentials.length} OAuth credentials`);
      
      if (credentials.length > 0) {
        console.log('\n📋 OAuth Credentials:');
        credentials.forEach((cred, index) => {
          console.log(`   ${index + 1}. User ID: ${cred.user_id}`);
          console.log(`      Service: ${cred.service_name}`);
          console.log(`      Created: ${new Date(cred.created_at).toLocaleDateString()}`);
          console.log(`      Expires: ${cred.expiry_date ? new Date(cred.expiry_date).toLocaleDateString() : 'No expiry'}`);
          console.log('');
        });
      }
    }
    
    // Check workflow deployments
    console.log('6. Checking Workflow Deployments...');
    const { data: workflows, error: workflowError } = await supabase
      .from('workflow_deployments')
      .select('*');
    
    if (workflowError) {
      console.log(`❌ Error fetching workflows: ${workflowError.message}`);
    } else {
      console.log(`✅ Found ${workflows.length} workflow deployments`);
      
      if (workflows.length > 0) {
        console.log('\n📋 Workflow Deployments:');
        workflows.forEach((workflow, index) => {
          console.log(`   ${index + 1}. User ID: ${workflow.user_id}`);
          console.log(`      Workflow Name: ${workflow.workflow_name}`);
          console.log(`      Status: ${workflow.workflow_status}`);
          console.log(`      n8n ID: ${workflow.n8n_workflow_id || 'Not set'}`);
          console.log(`      Deployed: ${workflow.deployed_at ? new Date(workflow.deployed_at).toLocaleDateString() : 'Not deployed'}`);
          console.log('');
        });
      }
    }
    
    // Check user analytics
    console.log('7. Checking User Analytics...');
    const { data: analytics, error: analyticsError } = await supabase
      .from('user_analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (analyticsError) {
      console.log(`❌ Error fetching analytics: ${analyticsError.message}`);
    } else {
      console.log(`✅ Found analytics data (showing last 10 events)`);
      
      if (analytics.length > 0) {
        console.log('\n📋 Recent Analytics Events:');
        analytics.forEach((event, index) => {
          console.log(`   ${index + 1}. User ID: ${event.user_id}`);
          console.log(`      Event Type: ${event.event_type}`);
          console.log(`      Event Data: ${JSON.stringify(event.event_data).substring(0, 80)}...`);
          console.log(`      Created: ${new Date(event.created_at).toLocaleDateString()}`);
          console.log('');
        });
      }
    }
    
    // Summary
    console.log('\n📊 SUMMARY');
    console.log('==========');
    
    const authUserCount = authUsers?.users?.length || 0;
    const publicUserCount = publicUsers?.length || 0;
    const onboardingCount = onboardingData?.length || 0;
    const configCount = businessConfigs?.length || 0;
    const credentialCount = credentials?.length || 0;
    const workflowCount = workflows?.length || 0;
    
    console.log(`👥 Auth Users: ${authUserCount}`);
    console.log(`👤 Public Users: ${publicUserCount}`);
    console.log(`🎯 Onboarding Records: ${onboardingCount}`);
    console.log(`🏢 Business Configs: ${configCount}`);
    console.log(`🔗 OAuth Credentials: ${credentialCount}`);
    console.log(`⚙️ Workflow Deployments: ${workflowCount}`);
    
    if (authUserCount === 0) {
      console.log('\n🎯 NEXT STEPS:');
      console.log('✅ Database is ready for new users');
      console.log('✅ Go to https://app.floworx-iq.com/register to create your first account');
      console.log('✅ Test the complete onboarding flow');
    } else {
      console.log('\n🎯 EXISTING DATA FOUND:');
      console.log('✅ Users are already registered in the system');
      console.log('✅ You can login at https://app.floworx-iq.com/login');
      console.log('✅ Check onboarding progress and business configurations');
    }
    
  } catch (error) {
    console.error('❌ Error checking existing users:', error.message);
  }
}

checkExistingUsers();
