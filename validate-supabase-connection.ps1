# Supabase Connection Validation Script
# Validates Supabase database connection and resolves common issues

Write-Host "🔍 SUPABASE CONNECTION VALIDATOR" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Function to test URL format
function Test-SupabaseUrl {
    param([string]$url)
    
    if ([string]::IsNullOrEmpty($url)) {
        return @{ Valid = $false; Error = "URL is empty or null" }
    }
    
    # Check if it's a valid PostgreSQL URL format
    if ($url -match '^postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)$') {
        $username = $matches[1]
        $password = $matches[2]
        $host = $matches[3]
        $port = $matches[4]
        $database = $matches[5]
        
        return @{
            Valid = $true
            Username = $username
            Host = $host
            Port = $port
            Database = $database
            PasswordLength = $password.Length
        }
    } else {
        return @{ Valid = $false; Error = "Invalid PostgreSQL URL format" }
    }
}

# Function to test connection using Node.js
function Test-DatabaseConnection {
    param([string]$connectionString)
    
    Write-Host "🔌 Testing database connection..." -ForegroundColor Yellow
    
    # Create temporary test script
    $testScript = @"
const { Pool } = require('pg');

async function testConnection() {
    const connectionString = '$connectionString';
    
    try {
        const pool = new Pool({
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        });
        
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        
        console.log('✅ CONNECTION SUCCESS');
        console.log('Current Time:', result.rows[0].current_time);
        console.log('PostgreSQL Version:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
        
        client.release();
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.log('❌ CONNECTION FAILED:', error.message);
        
        if (error.message.includes('ENOTFOUND')) {
            console.log('🔧 FIX: Check hostname in connection string');
        } else if (error.message.includes('authentication failed')) {
            console.log('🔧 FIX: Check username/password in connection string');
        } else if (error.message.includes('database') && error.message.includes('does not exist')) {
            console.log('🔧 FIX: Check database name in connection string');
        } else if (error.message.includes('timeout')) {
            console.log('🔧 FIX: Check network connectivity and firewall settings');
        }
        
        process.exit(1);
    }
}

testConnection();
"@

    $testScript | Out-File -FilePath "temp_db_test.js" -Encoding UTF8
    
    try {
        # Check if Node.js is available
        $nodeVersion = node --version 2>$null
        if (-not $nodeVersion) {
            Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
            return $false
        }
        
        # Check if pg module is available
        $pgCheck = npm list pg --depth=0 2>$null
        if (-not $pgCheck -or $pgCheck -match "UNMET DEPENDENCY") {
            Write-Host "📦 Installing pg module..." -ForegroundColor Yellow
            npm install pg 2>$null
        }
        
        # Run the test
        $result = node temp_db_test.js 2>&1
        $exitCode = $LASTEXITCODE
        
        Write-Host $result
        
        return $exitCode -eq 0
    }
    finally {
        # Clean up
        if (Test-Path "temp_db_test.js") {
            Remove-Item "temp_db_test.js" -Force
        }
    }
}

# Main validation process
Write-Host "Please provide your Supabase connection details:" -ForegroundColor Cyan
Write-Host ""

# Get connection string from user
$connectionString = Read-Host "Enter your Supabase PostgreSQL URL"

if ([string]::IsNullOrEmpty($connectionString)) {
    Write-Host "❌ No connection string provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 Validating URL format..." -ForegroundColor Yellow

# Validate URL format
$urlValidation = Test-SupabaseUrl -url $connectionString

if (-not $urlValidation.Valid) {
    Write-Host "❌ URL Format Error: $($urlValidation.Error)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected format:" -ForegroundColor Yellow
    Write-Host "postgresql://username:password@host:port/database" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Yellow
    Write-Host "postgresql://postgres.abc123:mypassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ URL format is valid" -ForegroundColor Green
Write-Host "   Username: $($urlValidation.Username)" -ForegroundColor Gray
Write-Host "   Host: $($urlValidation.Host)" -ForegroundColor Gray
Write-Host "   Port: $($urlValidation.Port)" -ForegroundColor Gray
Write-Host "   Database: $($urlValidation.Database)" -ForegroundColor Gray
Write-Host "   Password: $('*' * $urlValidation.PasswordLength) characters" -ForegroundColor Gray
Write-Host ""

# Test actual connection
$connectionSuccess = Test-DatabaseConnection -connectionString $connectionString

Write-Host ""
if ($connectionSuccess) {
    Write-Host "🎉 VALIDATION COMPLETE - CONNECTION SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Your Supabase connection is working correctly." -ForegroundColor Green
    Write-Host "✅ You can use this connection string in your application." -ForegroundColor Green
} else {
    Write-Host "❌ VALIDATION FAILED - CONNECTION ISSUES DETECTED" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Common Solutions:" -ForegroundColor Yellow
    Write-Host "1. Verify credentials in Supabase Dashboard Settings Database" -ForegroundColor Cyan
    Write-Host "2. Check if your IP is allowed in Supabase Settings Authentication" -ForegroundColor Cyan
    Write-Host "3. Ensure you're using the pooler connection string (port 6543)" -ForegroundColor Cyan
    Write-Host "4. Try regenerating database password in Supabase Dashboard" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🔒 Security Reminder:" -ForegroundColor Yellow
Write-Host "- Never commit database credentials to version control" -ForegroundColor Red
Write-Host "- Use environment variables for production" -ForegroundColor Red
Write-Host "- Rotate credentials regularly" -ForegroundColor Red

Write-Host ""
Write-Host "Press any key to exit..."
Read-Host
