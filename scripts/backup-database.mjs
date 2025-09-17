#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * Creates a full database backup using pg_dump before any destructive operations.
 * Implements the guardrail requirement: backup before any changes.
 * 
 * Usage: node scripts/backup-database.mjs
 * Output: backups/YYYY-MM-DD-HH-MM-SS.sql
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Ensure backups directory exists
mkdirSync('backups', { recursive: true });

console.log('🛡️ Starting database backup (GUARDRAIL)...');

function createBackup() {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '-')
    .substring(0, 19); // YYYY-MM-DD-HH-MM-SS
  
  const backupFile = join('backups', `${timestamp}.sql`);
  
  console.log(`📦 Creating backup: ${backupFile}`);
  
  try {
    // Use pg_dump to create a complete backup
    const command = `pg_dump "${DATABASE_URL}" --verbose --clean --if-exists --create`;
    
    console.log('⏳ Running pg_dump...');
    const backup = execSync(command, { 
      encoding: 'utf8',
      maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large databases
      stdio: ['pipe', 'pipe', 'inherit'] // Show stderr for progress
    });
    
    // Write backup to file
    import('fs').then(fs => {
      fs.writeFileSync(backupFile, backup);
      
      // Get file size
      const stats = fs.statSync(backupFile);
      const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
      
      console.log(`✅ Backup created successfully!`);
      console.log(`📁 File: ${backupFile}`);
      console.log(`📊 Size: ${sizeMB} MB`);
      
      // Create a latest backup symlink/copy
      try {
        fs.copyFileSync(backupFile, join('backups', 'latest.sql'));
        console.log(`🔗 Latest backup: backups/latest.sql`);
      } catch (error) {
        console.warn('⚠️ Could not create latest backup link:', error.message);
      }
      
      console.log('\n🛡️ BACKUP GUARDRAIL COMPLETE');
      console.log('============================');
      console.log('✅ Database backup created before any destructive operations');
      console.log('✅ Ready to proceed with audit and cleanup operations');
      console.log(`✅ Restore command: psql "${DATABASE_URL}" < ${backupFile}`);
    });
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    console.error('\n🚨 BACKUP FAILED - STOPPING');
    console.error('============================');
    console.error('❌ Cannot proceed with destructive operations without backup');
    console.error('❌ Please fix backup issues before continuing');
    process.exit(1);
  }
}

// Verify pg_dump is available
function verifyTools() {
  try {
    execSync('pg_dump --version', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ pg_dump is available');
  } catch (error) {
    console.error('❌ pg_dump is not available. Please install PostgreSQL client tools.');
    console.error('   - Windows: Download from https://www.postgresql.org/download/windows/');
    console.error('   - macOS: brew install postgresql');
    console.error('   - Linux: apt-get install postgresql-client');
    process.exit(1);
  }
}

// Test database connection
function testConnection() {
  console.log('🔌 Testing database connection...');
  try {
    const result = execSync(`psql "${DATABASE_URL}" -c "SELECT version();" --quiet --tuples-only`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Please check your DATABASE_URL environment variable');
    return false;
  }
}

// Show backup history
function showBackupHistory() {
  console.log('\n📚 BACKUP HISTORY');
  console.log('=================');
  
  try {
    import('fs').then(fs => {
      if (!existsSync('backups')) {
        console.log('No previous backups found');
        return;
      }
      
      const files = fs.readdirSync('backups')
        .filter(f => f.endsWith('.sql') && f !== 'latest.sql')
        .sort()
        .reverse()
        .slice(0, 5); // Show last 5 backups
      
      if (files.length === 0) {
        console.log('No previous backups found');
        return;
      }
      
      files.forEach(file => {
        const stats = fs.statSync(join('backups', file));
        const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
        const date = new Date(stats.mtime).toLocaleString();
        console.log(`📦 ${file} (${sizeMB} MB, ${date})`);
      });
    });
  } catch (error) {
    console.warn('⚠️ Could not read backup history:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🛡️ DATABASE BACKUP GUARDRAIL');
  console.log('============================');
  console.log('This backup is required before any destructive database operations');
  console.log('as part of the Supabase cleanup audit process.\n');
  
  // Verify tools and connection
  verifyTools();
  if (!testConnection()) {
    process.exit(1);
  }
  
  // Show backup history
  await showBackupHistory();
  
  // Create backup
  createBackup();
}

main().catch(console.error);
