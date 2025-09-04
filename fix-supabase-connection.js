#!/usr/bin/env node

/**
 * Supabase Connection Fix Tool
 * Diagnoses and fixes Supabase connection issues
 */

const { execSync } = require('child_process');
const fs = require('fs');

class SupabaseConnectionFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.vercelEnvVars = {};
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async getVercelEnvVars() {
    this.log('\n🔍 CHECKING CURRENT VERCEL ENVIRONMENT VARIABLES', 'info');
    
    try {
      const output = execSync('vercel env ls', { encoding: 'utf8' });
      this.log('✅ Successfully retrieved Vercel environment variables', 'success');
      
      // Parse the output to check which variables exist
      const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY', 
        'SUPABASE_SERVICE_ROLE_KEY',
        'JWT_SECRET',
        'ENCRYPTION_KEY'
      ];
      
      const existingVars = [];
      const missingVars = [];
      
      requiredVars.forEach(varName => {
        if (output.includes(varName)) {
          existingVars.push(varName);
          this.log(`✅ ${varName}: Found`, 'success');
        } else {
          missingVars.push(varName);
          this.log(`❌ ${varName}: Missing`, 'error');
        }
      });
      
      return { existingVars, missingVars };
      
    } catch (error) {
      this.log(`❌ Failed to get Vercel env vars: ${error.message}`, 'error');
      return { existingVars: [], missingVars: [] };
    }
  }

  async testSupabaseCredentials() {
    this.log('\n🧪 TESTING SUPABASE CREDENTIALS', 'info');
    
    // Create a test script to validate Supabase connection
    const testScript = `
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Get environment variables from Vercel
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅ Set' : '❌ Missing');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    // Test anonymous client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Anonymous client created');
    
    // Test service role client
    if (serviceKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey);
      console.log('✅ Service role client created');
      
      // Test actual connection with a simple query
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);
        
      if (error) {
        if (error.message.includes('relation "users" does not exist')) {
          console.log('❌ Users table does not exist');
          return { success: false, issue: 'MISSING_USERS_TABLE' };
        } else if (error.message.includes('JWT')) {
          console.log('❌ JWT/Authentication issue');
          return { success: false, issue: 'JWT_ERROR' };
        } else {
          console.log('⚠️  Query error (may be RLS):', error.message);
          return { success: true, issue: 'RLS_EXPECTED' };
        }
      } else {
        console.log('✅ Database query successful');
        return { success: true, issue: null };
      }
    }
    
    return { success: true, issue: 'PARTIAL_SUCCESS' };
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return { success: false, issue: 'CONNECTION_FAILED', error: error.message };
  }
}

testConnection().then(result => {
  console.log('Test result:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});
`;

    // Save and run the test script
    fs.writeFileSync('./test-supabase-credentials.js', testScript);
    
    try {
      const output = execSync('node test-supabase-credentials.js', { 
        encoding: 'utf8',
        env: { ...process.env }
      });
      this.log('✅ Supabase credentials test completed', 'success');
      this.log(output, 'info');
      return true;
    } catch (error) {
      this.log('❌ Supabase credentials test failed', 'error');
      this.log(error.stdout || error.message, 'error');
      return false;
    }
  }

  async generateSupabaseSetupCommands() {
    this.log('\n📋 GENERATING SUPABASE SETUP COMMANDS', 'info');
    
    const commands = [
      '# Step 1: Check current Vercel environment variables',
      'vercel env ls',
      '',
      '# Step 2: Pull current environment variables to check values',
      'vercel env pull .env.vercel',
      '',
      '# Step 3: If Supabase variables are incorrect, update them:',
      '# Replace YOUR_SUPABASE_URL with your actual Supabase project URL',
      'vercel env add SUPABASE_URL',
      '# When prompted, enter: https://YOUR_PROJECT_REF.supabase.co',
      '',
      '# Replace YOUR_ANON_KEY with your actual anon key from Supabase dashboard',
      'vercel env add SUPABASE_ANON_KEY',
      '',
      '# Replace YOUR_SERVICE_KEY with your service role key from Supabase dashboard',
      'vercel env add SUPABASE_SERVICE_ROLE_KEY',
      '',
      '# Step 4: Redeploy to apply new environment variables',
      'vercel --prod',
      '',
      '# Step 5: Test the connection',
      'node test-production-functionality.js'
    ];
    
    const commandsFile = './supabase-setup-commands.txt';
    fs.writeFileSync(commandsFile, commands.join('\n'));
    
    this.log(`📄 Setup commands saved to: ${commandsFile}`, 'info');
    
    return commands;
  }

  async checkSupabaseProject() {
    this.log('\n🏗️  CHECKING SUPABASE PROJECT STATUS', 'info');
    
    // Try to get Supabase URL from Vercel
    try {
      execSync('vercel env pull .env.vercel', { encoding: 'utf8' });
      
      if (fs.existsSync('.env.vercel')) {
        const envContent = fs.readFileSync('.env.vercel', 'utf8');
        const supabaseUrl = envContent.match(/SUPABASE_URL="?([^"\n]+)"?/)?.[1];
        
        if (supabaseUrl) {
          this.log(`Found Supabase URL: ${supabaseUrl}`, 'info');
          
          // Extract project reference
          const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
          if (projectRef) {
            this.log(`Project Reference: ${projectRef}`, 'info');
            
            this.log('\n📋 MANUAL VERIFICATION STEPS:', 'warning');
            this.log('1. Go to https://supabase.com/dashboard', 'warning');
            this.log(`2. Find project: ${projectRef}`, 'warning');
            this.log('3. Check if project is active (not paused)', 'warning');
            this.log('4. Go to Settings > API to verify keys', 'warning');
            this.log('5. Check Database > Tables to ensure users table exists', 'warning');
          }
        }
      }
    } catch (error) {
      this.log('Could not pull environment variables for analysis', 'warning');
    }
  }

  async runDiagnosticFix() {
    this.log('🔧 STARTING SUPABASE CONNECTION DIAGNOSTIC & FIX', 'info');
    this.log('=' * 60, 'info');

    try {
      // Step 1: Check Vercel environment variables
      const { existingVars, missingVars } = await this.getVercelEnvVars();
      
      // Step 2: Test current credentials
      const credentialsValid = await this.testSupabaseCredentials();
      
      // Step 3: Check Supabase project status
      await this.checkSupabaseProject();
      
      // Step 4: Generate setup commands
      await this.generateSupabaseSetupCommands();
      
      // Step 5: Generate report
      this.generateFixReport(existingVars, missingVars, credentialsValid);
      
    } catch (error) {
      this.log(`💥 Diagnostic failed: ${error.message}`, 'error');
    }
  }

  generateFixReport(existingVars, missingVars, credentialsValid) {
    this.log('\n📊 SUPABASE CONNECTION FIX REPORT', 'info');
    this.log('=' * 60, 'info');
    
    this.log(`✅ Environment Variables Found: ${existingVars.length}`, 'success');
    this.log(`❌ Environment Variables Missing: ${missingVars.length}`, missingVars.length > 0 ? 'error' : 'success');
    this.log(`🔐 Credentials Valid: ${credentialsValid ? 'Yes' : 'No'}`, credentialsValid ? 'success' : 'error');
    
    if (missingVars.length > 0) {
      this.log('\n🚨 MISSING ENVIRONMENT VARIABLES:', 'error');
      missingVars.forEach(varName => {
        this.log(`• ${varName}`, 'error');
      });
    }
    
    if (!credentialsValid) {
      this.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:', 'warning');
      this.log('1. Verify Supabase project is active', 'warning');
      this.log('2. Check Supabase API keys in dashboard', 'warning');
      this.log('3. Update Vercel environment variables', 'warning');
      this.log('4. Redeploy application', 'warning');
    }
    
    this.log('\n📄 Next steps saved to: ./supabase-setup-commands.txt', 'info');
    this.log('📄 Test script saved to: ./test-supabase-credentials.js', 'info');
  }
}

// Run the diagnostic fix
if (require.main === module) {
  const fixer = new SupabaseConnectionFixer();
  fixer.runDiagnosticFix().catch(error => {
    console.error('❌ Fix tool error:', error);
    process.exit(1);
  });
}

module.exports = SupabaseConnectionFixer;
