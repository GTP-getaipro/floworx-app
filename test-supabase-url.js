// Supabase Connection Test
// Tests the connection string you provided

const { Pool } = require('pg');

// The URL you provided (SECURITY WARNING: This was shared publicly!)
const connectionString = 'postgresql://postgres.enamhufwobytrfydarsz:Qv5Zwrx1HiH4O1h4@aws-1-ca-central-1.pooler.supabase.com:6543/postgres';

console.log('🔍 SUPABASE CONNECTION VALIDATOR');
console.log('=================================\n');

console.log('⚠️  SECURITY WARNING: You shared database credentials publicly!');
console.log('   Please rotate these credentials immediately in Supabase Dashboard\n');

// Parse URL components
function parsePostgresUrl(url) {
    const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
    if (!match) return null;
    
    return {
        username: match[1],
        password: match[2],
        host: match[3],
        port: match[4],
        database: match[5]
    };
}

const parsed = parsePostgresUrl(connectionString);

if (!parsed) {
    console.log('❌ Invalid PostgreSQL URL format');
    process.exit(1);
}

console.log('✅ URL format is valid');
console.log(`   Username: ${parsed.username}`);
console.log(`   Host: ${parsed.host}`);
console.log(`   Port: ${parsed.port}`);
console.log(`   Database: ${parsed.database}`);
console.log(`   Password: ${'*'.repeat(parsed.password.length)} characters\n`);

// Validate components
console.log('🔍 Component Analysis:');

// Check username format
if (parsed.username.match(/^postgres\.[a-z0-9]+$/)) {
    console.log('✅ Username format: Valid Supabase format');
} else {
    console.log('❌ Username format: Invalid - should be postgres.xxxxx');
}

// Check host format
if (parsed.host.match(/^aws-\d+-[a-z]+-[a-z]+-\d+\.pooler\.supabase\.com$/)) {
    console.log('✅ Host format: Valid Supabase pooler');
} else {
    console.log('❌ Host format: Invalid Supabase pooler format');
}

// Check port
if (parsed.port === '6543') {
    console.log('✅ Port: Correct pooler port (6543)');
} else if (parsed.port === '5432') {
    console.log('⚠️  Port: Direct connection (5432) - pooler (6543) recommended');
} else {
    console.log('❌ Port: Invalid port for Supabase');
}

// Check database name
if (parsed.database === 'postgres') {
    console.log('✅ Database: Standard postgres database');
} else {
    console.log('⚠️  Database: Non-standard database name');
}

console.log('\n🧪 Testing Connection...');

async function testConnection() {
    try {
        const pool = new Pool({
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        });
        
        console.log('🔌 Attempting connection...');
        const client = await pool.connect();
        
        console.log('📊 Running test query...');
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        
        console.log('\n✅ CONNECTION SUCCESSFUL!');
        console.log(`   Server Time: ${result.rows[0].current_time}`);
        console.log(`   PostgreSQL Version: ${result.rows[0].pg_version.split(' ').slice(0, 2).join(' ')}`);
        
        // Test basic table access
        try {
            const tableTest = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5");
            console.log(`   Tables found: ${tableTest.rows.length} public tables`);
        } catch (tableError) {
            console.log('   Table access: Limited (this is normal for security)');
        }
        
        client.release();
        await pool.end();
        
        console.log('\n🎉 SUCCESS: Your Supabase connection is working!');
        console.log('\n✅ Next Steps:');
        console.log('1. IMMEDIATELY rotate these credentials in Supabase Dashboard');
        console.log('2. Store new credentials in environment variables');
        console.log('3. Never share credentials in plain text again');
        
    } catch (error) {
        console.log('\n❌ CONNECTION FAILED:', error.message);
        
        if (error.code === 'ENOTFOUND') {
            console.log('\n🔧 Issue: Cannot resolve hostname');
            console.log('   Solution: Check internet connection and hostname');
        } else if (error.code === '28P01') {
            console.log('\n🔧 Issue: Authentication failed');
            console.log('   Solution: Check username/password or rotate credentials');
        } else if (error.code === '3D000') {
            console.log('\n🔧 Issue: Database does not exist');
            console.log('   Solution: Check database name in connection string');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('\n🔧 Issue: Connection timeout');
            console.log('   Solution: Check firewall/network settings');
        } else {
            console.log(`\n🔧 Error Code: ${error.code || 'Unknown'}`);
            console.log(`   Full Error: ${error.message}`);
        }
        
        console.log('\n❌ Connection validation failed');
        process.exit(1);
    }
}

console.log('\n🔒 CRITICAL SECURITY REMINDER:');
console.log('Your database credentials were exposed publicly!');
console.log('Go to Supabase Dashboard > Settings > Database > Reset database password');

// Run the test
testConnection().catch(console.error);
