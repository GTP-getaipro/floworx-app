// Comprehensive Supabase Environment Test
// Tests all Supabase credentials from .env file

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

console.log('🔍 SUPABASE ENVIRONMENT CREDENTIALS TEST');
console.log('========================================\n');

// Check if .env file exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found in current directory');
    console.log('   Expected location:', envPath);
    process.exit(1);
}

console.log('✅ .env file found\n');

// Environment variables to check
const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DATABASE_URL'
];

console.log('📋 Environment Variables Check:');
console.log('==============================');

// Check required variables
let missingRequired = [];
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: Set (${value.length} characters)`);
        if (varName.includes('KEY') && value.length < 50) {
            console.log(`   ⚠️  Warning: ${varName} seems too short for a valid key`);
        }
    } else {
        console.log(`❌ ${varName}: Missing`);
        missingRequired.push(varName);
    }
});

// Check optional variables
console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: Set (${value.length} characters)`);
    } else {
        console.log(`⚪ ${varName}: Not set`);
    }
});

if (missingRequired.length > 0) {
    console.log(`\n❌ Missing required variables: ${missingRequired.join(', ')}`);
    console.log('Please add these to your .env file');
    process.exit(1);
}

console.log('\n🧪 Testing Supabase Connections...');
console.log('==================================');

// Test 1: Supabase Client (Anonymous)
async function testSupabaseClient() {
    console.log('\n1️⃣ Testing Supabase Client (Anonymous Key)...');
    
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Test basic connection with a simple query
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error) {
            if (error.message.includes('relation "users" does not exist')) {
                console.log('⚠️  Users table does not exist (may need migration)');
                return { success: true, issue: 'MISSING_USERS_TABLE' };
            } else if (error.message.includes('JWT')) {
                console.log('❌ JWT/Authentication issue with anonymous key');
                console.log('   Error:', error.message);
                return { success: false, issue: 'JWT_ERROR' };
            } else if (error.message.includes('Invalid API key')) {
                console.log('❌ Invalid SUPABASE_ANON_KEY');
                return { success: false, issue: 'INVALID_ANON_KEY' };
            } else {
                console.log('⚠️  Query error (may be RLS protection):', error.message);
                return { success: true, issue: 'RLS_EXPECTED' };
            }
        } else {
            console.log('✅ Anonymous client connection successful');
            return { success: true, issue: null };
        }
    } catch (error) {
        console.log('❌ Anonymous client failed:', error.message);
        return { success: false, issue: 'CLIENT_ERROR', error: error.message };
    }
}

// Test 2: Service Role Client
async function testServiceRoleClient() {
    console.log('\n2️⃣ Testing Service Role Client...');
    
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Test service role access
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            if (error.message.includes('relation "users" does not exist')) {
                console.log('⚠️  Users table does not exist (may need migration)');
                return { success: true, issue: 'MISSING_USERS_TABLE' };
            } else if (error.message.includes('JWT')) {
                console.log('❌ JWT/Authentication issue with service role key');
                console.log('   Error:', error.message);
                return { success: false, issue: 'JWT_ERROR' };
            } else if (error.message.includes('Invalid API key')) {
                console.log('❌ Invalid SUPABASE_SERVICE_ROLE_KEY');
                return { success: false, issue: 'INVALID_SERVICE_KEY' };
            } else {
                console.log('❌ Service role query error:', error.message);
                return { success: false, issue: 'QUERY_ERROR' };
            }
        } else {
            console.log('✅ Service role client connection successful');
            console.log(`   Found ${data ? data.length : 0} user records`);
            return { success: true, issue: null };
        }
    } catch (error) {
        console.log('❌ Service role client failed:', error.message);
        return { success: false, issue: 'SERVICE_CLIENT_ERROR', error: error.message };
    }
}

// Test 3: Direct Database Connection
async function testDirectConnection() {
    console.log('\n3️⃣ Testing Direct Database Connection...');
    
    // Try different connection methods
    const connectionMethods = [];
    
    // Method 1: DATABASE_URL if available
    if (process.env.DATABASE_URL) {
        connectionMethods.push({
            name: 'DATABASE_URL',
            config: { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
        });
    }
    
    // Method 2: Individual DB variables
    if (process.env.DB_HOST) {
        connectionMethods.push({
            name: 'Individual DB vars',
            config: {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME || 'postgres',
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                ssl: { rejectUnauthorized: false }
            }
        });
    }
    
    // Method 3: Extract from SUPABASE_URL
    if (process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('postgresql://')) {
        connectionMethods.push({
            name: 'SUPABASE_URL as connection string',
            config: { connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } }
        });
    }
    
    if (connectionMethods.length === 0) {
        console.log('❌ No database connection configuration found');
        return { success: false, issue: 'NO_DB_CONFIG' };
    }
    
    for (const method of connectionMethods) {
        console.log(`\n   Testing ${method.name}...`);
        
        try {
            const pool = new Pool(method.config);
            const client = await pool.connect();
            
            const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
            
            console.log(`   ✅ ${method.name}: SUCCESS`);
            console.log(`      Server Time: ${result.rows[0].current_time}`);
            console.log(`      PostgreSQL: ${result.rows[0].pg_version.split(' ').slice(0, 2).join(' ')}`);
            
            client.release();
            await pool.end();
            
            return { success: true, method: method.name };
            
        } catch (error) {
            console.log(`   ❌ ${method.name}: FAILED`);
            console.log(`      Error: ${error.message}`);
            
            if (error.code === 'ENOTFOUND') {
                console.log('      Issue: Cannot resolve hostname');
            } else if (error.code === '28P01') {
                console.log('      Issue: Authentication failed');
            } else if (error.code === '3D000') {
                console.log('      Issue: Database does not exist');
            }
        }
    }
    
    return { success: false, issue: 'ALL_DB_METHODS_FAILED' };
}

// Test 4: URL Format Validation
function testUrlFormats() {
    console.log('\n4️⃣ Testing URL Formats...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    
    if (supabaseUrl.startsWith('https://')) {
        console.log('✅ SUPABASE_URL: Valid HTTPS format');
        
        if (supabaseUrl.includes('.supabase.co')) {
            console.log('✅ SUPABASE_URL: Valid Supabase domain');
        } else {
            console.log('⚠️  SUPABASE_URL: Non-standard domain (may be custom)');
        }
    } else if (supabaseUrl.startsWith('postgresql://')) {
        console.log('⚠️  SUPABASE_URL: PostgreSQL connection string format');
        console.log('   This should typically be an HTTPS URL for Supabase client');
    } else {
        console.log('❌ SUPABASE_URL: Invalid format');
        return { success: false, issue: 'INVALID_URL_FORMAT' };
    }
    
    return { success: true };
}

// Run all tests
async function runAllTests() {
    const results = {
        supabaseClient: await testSupabaseClient(),
        serviceRole: await testServiceRoleClient(),
        directConnection: await testDirectConnection(),
        urlFormats: testUrlFormats()
    };
    
    console.log('\n📊 TEST SUMMARY:');
    console.log('================');
    
    Object.entries(results).forEach(([test, result]) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${test}: ${status}`);
        if (result.issue) {
            console.log(`   Issue: ${result.issue}`);
        }
    });
    
    const allPassed = Object.values(results).every(result => result.success);
    console.log(`\nOverall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ ISSUES DETECTED'}`);
    
    if (!allPassed) {
        console.log('\n🔧 RECOMMENDED FIXES:');
        
        if (!results.supabaseClient.success) {
            console.log('- Check SUPABASE_URL and SUPABASE_ANON_KEY in Supabase Dashboard');
        }
        if (!results.serviceRole.success) {
            console.log('- Check SUPABASE_SERVICE_ROLE_KEY in Supabase Dashboard');
        }
        if (!results.directConnection.success) {
            console.log('- Check database connection parameters or run migrations');
        }
        if (!results.urlFormats.success) {
            console.log('- Fix SUPABASE_URL format');
        }
    }
    
    return allPassed;
}

// Execute tests
runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
});
