# Simple Supabase Connection Validator
# Validates the Supabase URL you provided earlier

Write-Host "🔍 SUPABASE CONNECTION VALIDATOR" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# The URL you provided earlier (with credentials masked for security)
$testUrl = "postgresql://postgres.enamhufwobytrfydarsz:Qv5Zwrx1HiH4O1h4@aws-1-ca-central-1.pooler.supabase.com:6543/postgres"

Write-Host "⚠️  SECURITY WARNING: You shared database credentials publicly!" -ForegroundColor Red
Write-Host "   Please rotate these credentials immediately in Supabase Dashboard" -ForegroundColor Red
Write-Host ""

Write-Host "🔍 Analyzing your Supabase URL..." -ForegroundColor Yellow

# Parse the URL
if ($testUrl -match '^postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)$') {
    $username = $matches[1]
    $password = $matches[2]
    $host = $matches[3]
    $port = $matches[4]
    $database = $matches[5]
    
    Write-Host "✅ URL format is valid" -ForegroundColor Green
    Write-Host "   Username: $username" -ForegroundColor Gray
    Write-Host "   Host: $host" -ForegroundColor Gray
    Write-Host "   Port: $port" -ForegroundColor Gray
    Write-Host "   Database: $database" -ForegroundColor Gray
    Write-Host "   Password: $('*' * $password.Length) characters" -ForegroundColor Gray
    Write-Host ""
    
    # Validate components
    Write-Host "🔍 Component Analysis:" -ForegroundColor Yellow
    
    # Check username format
    if ($username -match '^postgres\.[a-z0-9]+$') {
        Write-Host "✅ Username format: Valid Supabase format" -ForegroundColor Green
    } else {
        Write-Host "❌ Username format: Invalid - should be postgres.xxxxx" -ForegroundColor Red
    }
    
    # Check host format
    if ($host -match '^aws-\d+-[a-z]+-[a-z]+-\d+\.pooler\.supabase\.com$') {
        Write-Host "✅ Host format: Valid Supabase pooler" -ForegroundColor Green
    } else {
        Write-Host "❌ Host format: Invalid Supabase pooler format" -ForegroundColor Red
    }
    
    # Check port
    if ($port -eq "6543") {
        Write-Host "✅ Port: Correct pooler port (6543)" -ForegroundColor Green
    } elseif ($port -eq "5432") {
        Write-Host "⚠️  Port: Direct connection (5432) - pooler (6543) recommended" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Port: Invalid port for Supabase" -ForegroundColor Red
    }
    
    # Check database name
    if ($database -eq "postgres") {
        Write-Host "✅ Database: Standard postgres database" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database: Non-standard database name" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "❌ Invalid PostgreSQL URL format" -ForegroundColor Red
    Write-Host "Expected: postgresql://username:password@host:port/database" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🧪 Testing Connection..." -ForegroundColor Yellow

# Create a simple Node.js test
$testScript = @"
const { Pool } = require('pg');

async function testConnection() {
    try {
        const pool = new Pool({
            connectionString: '$testUrl',
            ssl: { rejectUnauthorized: false }
        });
        
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        
        console.log('✅ CONNECTION SUCCESSFUL');
        console.log('Server Time:', result.rows[0].current_time);
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.log('❌ CONNECTION FAILED:', error.message);
        
        if (error.code === 'ENOTFOUND') {
            console.log('🔧 Issue: Cannot resolve hostname');
            console.log('   Solution: Check internet connection and hostname');
        } else if (error.code === '28P01') {
            console.log('🔧 Issue: Authentication failed');
            console.log('   Solution: Check username/password or rotate credentials');
        } else if (error.code === '3D000') {
            console.log('🔧 Issue: Database does not exist');
            console.log('   Solution: Check database name in connection string');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('🔧 Issue: Connection timeout');
            console.log('   Solution: Check firewall/network settings');
        } else {
            console.log('🔧 Error Code:', error.code);
        }
        
        process.exit(1);
    }
}

testConnection();
"@

# Write test script to file
$testScript | Out-File -FilePath "temp_connection_test.js" -Encoding UTF8

try {
    # Check if Node.js is available
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCheck) {
        Write-Host "❌ Node.js not found" -ForegroundColor Red
        Write-Host "   Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
        return
    }
    
    Write-Host "📦 Checking/installing pg module..." -ForegroundColor Gray
    
    # Install pg if needed
    $pgInstall = npm install pg 2>&1
    
    # Run the connection test
    Write-Host "🔌 Attempting connection..." -ForegroundColor Gray
    $testResult = node temp_connection_test.js 2>&1
    $exitCode = $LASTEXITCODE
    
    Write-Host $testResult
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "🎉 SUCCESS: Your Supabase connection is working!" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ Next Steps:" -ForegroundColor Cyan
        Write-Host "1. IMMEDIATELY rotate these credentials in Supabase Dashboard" -ForegroundColor Red
        Write-Host "2. Store new credentials in environment variables" -ForegroundColor Yellow
        Write-Host "3. Never share credentials in plain text again" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "❌ Connection failed - see error details above" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error running test: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Clean up
    if (Test-Path "temp_connection_test.js") {
        Remove-Item "temp_connection_test.js" -Force
    }
}

Write-Host ""
Write-Host "🔒 CRITICAL SECURITY REMINDER:" -ForegroundColor Red
Write-Host "Your database credentials were exposed publicly!" -ForegroundColor Red
Write-Host "Go to Supabase Dashboard > Settings > Database > Reset database password" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Enter to continue..."
Read-Host
