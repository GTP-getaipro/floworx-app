#!/usr/bin/env node

/**
 * Audit Status Script
 * 
 * Shows the current status of the audit system and available reports.
 * 
 * Usage: node scripts/audit-status.mjs
 */

import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

console.log('📊 SUPABASE AUDIT SYSTEM STATUS');
console.log('===============================\n');

// Check if audit directory exists
if (!existsSync('.audit')) {
  console.log('❌ Audit system not initialized');
  console.log('   Run: npm run audit:supabase');
  process.exit(1);
}

// Check for backup
console.log('🛡️ BACKUP STATUS');
console.log('================');
if (existsSync('backups')) {
  const backups = readdirSync('backups')
    .filter(f => f.endsWith('.sql'))
    .sort()
    .reverse();
  
  if (backups.length > 0) {
    const latest = backups[0];
    const stats = statSync(join('backups', latest));
    const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
    const age = Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60));
    
    console.log(`✅ Latest backup: ${latest}`);
    console.log(`   Size: ${sizeMB} MB, Age: ${age} hours`);
    console.log(`   Total backups: ${backups.length}`);
  } else {
    console.log('❌ No backups found');
    console.log('   Run: npm run audit:backup');
  }
} else {
  console.log('❌ Backup directory not found');
  console.log('   Run: npm run audit:backup');
}

// Check audit reports
console.log('\n📋 AUDIT REPORTS');
console.log('================');

const reports = [
  { file: 'latest-audit.json', name: 'Database Inventory', command: 'audit:supabase' },
  { file: 'static-refs.json', name: 'Static Code Analysis', command: 'audit:code' },
  { file: 'usage-stats.json', name: 'Dynamic Usage Stats', command: 'audit:usage' },
  { file: 'decision-matrix.csv', name: 'Decision Matrix', command: 'audit:analyze' }
];

reports.forEach(report => {
  const path = join('.audit', report.file);
  if (existsSync(path)) {
    const stats = statSync(path);
    const age = Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60));
    console.log(`✅ ${report.name}: ${age} hours old`);
  } else {
    console.log(`❌ ${report.name}: Not found`);
    console.log(`   Run: npm run ${report.command}`);
  }
});

// Show summary if available
if (existsSync('.audit/latest-audit.json')) {
  console.log('\n📊 DATABASE SUMMARY');
  console.log('===================');
  
  try {
    const audit = JSON.parse(readFileSync('.audit/latest-audit.json', 'utf8'));
    const summary = audit.summary;
    
    console.log(`Tables: ${summary.total_tables}`);
    console.log(`Total Rows: ${summary.total_rows?.toLocaleString() || 'N/A'}`);
    console.log(`Total Size: ${summary.total_size_mb} MB`);
    console.log(`RLS Policies: ${summary.total_policies}`);
    console.log(`Functions: ${summary.total_functions}`);
    console.log(`Triggers: ${summary.total_triggers}`);
    console.log(`Views: ${summary.total_views}`);
  } catch (error) {
    console.log('❌ Could not read audit summary');
  }
}

// Show code analysis summary
if (existsSync('.audit/static-refs.json')) {
  console.log('\n🔍 CODE ANALYSIS SUMMARY');
  console.log('=======================');
  
  try {
    const refs = JSON.parse(readFileSync('.audit/static-refs.json', 'utf8'));
    const stats = refs.stats || refs.summary;
    
    console.log(`Files Scanned: ${stats.files_scanned}`);
    console.log(`Total References: ${stats.total_references || stats.total_hits}`);
    console.log(`Unique Tables: ${stats.unique_tables}`);
    console.log(`Unique RPCs: ${stats.unique_rpcs}`);
    console.log(`Storage Buckets: ${stats.unique_storage_buckets}`);
  } catch (error) {
    console.log('❌ Could not read code analysis summary');
  }
}

// Check usage tracking status
console.log('\n📈 USAGE TRACKING');
console.log('=================');

const usageAudit = process.env.USAGE_AUDIT;
if (usageAudit === 'true') {
  console.log('✅ Usage tracking is ENABLED');
  console.log('   Data is being collected for dynamic analysis');
} else if (usageAudit === 'false') {
  console.log('⚠️ Usage tracking is DISABLED');
  console.log('   Enable with: USAGE_AUDIT=true');
} else {
  console.log('❓ Usage tracking status unknown');
  console.log('   Set USAGE_AUDIT=true to enable');
}

// Check for quarantined objects
console.log('\n🗄️ QUARANTINE STATUS');
console.log('====================');

if (process.env.DATABASE_URL) {
  console.log('🔌 Database connection available');
  console.log('   Check for _deprecated schema objects manually');
} else {
  console.log('❌ No DATABASE_URL - cannot check quarantine status');
}

// Next steps
console.log('\n🎯 NEXT STEPS');
console.log('=============');

const steps = [];

if (!existsSync('backups') || readdirSync('backups').length === 0) {
  steps.push('1. Create backup: npm run audit:backup');
}

if (!existsSync('.audit/latest-audit.json')) {
  steps.push('2. Run database inventory: npm run audit:supabase');
}

if (!existsSync('.audit/static-refs.json')) {
  steps.push('3. Run code analysis: npm run audit:code');
}

if (process.env.USAGE_AUDIT !== 'true') {
  steps.push('4. Enable usage tracking: USAGE_AUDIT=true');
}

if (!existsSync('.audit/usage-stats.json')) {
  steps.push('5. After 1 week, export usage: npm run audit:usage');
}

if (steps.length === 0) {
  console.log('✅ All audit components are ready!');
  console.log('   You can now analyze data and make cleanup decisions');
} else {
  steps.forEach(step => console.log(step));
}

console.log('\n📚 For detailed information, see: .audit/README.md');
