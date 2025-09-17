#!/usr/bin/env node

/**
 * Supabase Database Audit Script
 * 
 * Generates comprehensive inventory of:
 * - Tables (with row counts, sizes, vacuum stats)
 * - Columns and data types
 * - RLS policies
 * - Views and materialized views
 * - Functions (RPC endpoints)
 * - Triggers
 * - Table dependencies
 * - Storage buckets and objects
 * 
 * Usage: node scripts/audit-supabase.mjs
 * Output: .audit/ directory with CSV/JSON reports
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure audit directory exists
mkdirSync('.audit', { recursive: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('🔍 Starting Supabase database audit...');

// SQL queries for comprehensive inventory
const queries = {
  tables: `
    SELECT schemaname, relname AS table_name,
           n_live_tup AS rows, pg_total_relation_size(relid) AS bytes,
           last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
    FROM pg_stat_user_tables
    ORDER BY bytes DESC;
  `,
  
  columns: `
    SELECT table_schema, table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name, ordinal_position;
  `,
  
  policies: `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    ORDER BY 1,2;
  `,
  
  views: `
    SELECT table_schema, table_name, view_definition
    FROM information_schema.views
    WHERE table_schema NOT IN ('pg_catalog','information_schema');
  `,
  
  functions: `
    SELECT n.nspname AS schema, p.proname AS fn, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname NOT IN ('pg_catalog','information_schema')
    ORDER BY 1,2;
  `,
  
  triggers: `
    SELECT event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement
    FROM information_schema.triggers
    ORDER BY 1,2;
  `,
  
  dependencies: `
    SELECT
      dependent_ns.nspname   AS dependent_schema,
      dep_class.relname      AS dependent_object,
      source_ns.nspname      AS source_schema,
      src_class.relname      AS source_object,
      d.deptype
    FROM pg_depend d
    JOIN pg_class dep_class ON d.refobjid = dep_class.oid
    JOIN pg_class src_class ON d.objid    = src_class.oid
    JOIN pg_namespace dependent_ns ON dep_class.relnamespace = dependent_ns.oid
    JOIN pg_namespace source_ns    ON src_class.relnamespace  = source_ns.oid
    WHERE dependent_ns.nspname NOT IN ('pg_catalog','information_schema');
  `,
  
  storage_objects: `
    SELECT bucket_id, count(*) objects, sum(size) bytes 
    FROM storage.objects 
    GROUP BY 1 
    ORDER BY 3 DESC;
  `
};

// Execute SQL query and return results
function runQuery(name, sql) {
  console.log(`📊 Querying ${name}...`);
  try {
    const result = execSync(`psql "${DATABASE_URL}" -c "${sql.replace(/"/g, '\\"')}" --csv`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    return result.trim();
  } catch (error) {
    console.error(`❌ Error querying ${name}:`, error.message);
    return '';
  }
}

// Convert CSV to JSON for easier processing
function csvToJson(csv) {
  if (!csv) return [];
  const lines = csv.split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, ''));
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  }).filter(obj => Object.values(obj).some(v => v)); // Remove empty rows
}

// Generate summary statistics
function generateSummary(data) {
  const tables = data.tables || [];
  const totalTables = tables.length;
  const totalRows = tables.reduce((sum, t) => sum + parseInt(t.rows || 0), 0);
  const totalSize = tables.reduce((sum, t) => sum + parseInt(t.bytes || 0), 0);
  
  return {
    timestamp: new Date().toISOString(),
    summary: {
      total_tables: totalTables,
      total_rows: totalRows,
      total_size_bytes: totalSize,
      total_size_mb: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      total_policies: (data.policies || []).length,
      total_functions: (data.functions || []).length,
      total_triggers: (data.triggers || []).length,
      total_views: (data.views || []).length
    },
    largest_tables: tables.slice(0, 10).map(t => ({
      name: `${t.schemaname}.${t.table_name}`,
      rows: parseInt(t.rows || 0),
      size_mb: Math.round(parseInt(t.bytes || 0) / 1024 / 1024 * 100) / 100
    }))
  };
}

// Main execution
async function main() {
  const results = {};
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Execute all queries
  for (const [name, sql] of Object.entries(queries)) {
    const csv = runQuery(name, sql);
    const json = csvToJson(csv);
    results[name] = json;
    
    // Save individual CSV files
    writeFileSync(join('.audit', `${name}-${timestamp}.csv`), csv);
    console.log(`✅ Saved .audit/${name}-${timestamp}.csv (${json.length} rows)`);
  }
  
  // Generate and save comprehensive JSON report
  const summary = generateSummary(results);
  const report = {
    ...summary,
    data: results
  };
  
  writeFileSync(join('.audit', `full-audit-${timestamp}.json`), JSON.stringify(report, null, 2));
  console.log(`✅ Saved .audit/full-audit-${timestamp}.json`);
  
  // Create latest symlinks (or copies on Windows)
  try {
    writeFileSync(join('.audit', 'latest-audit.json'), JSON.stringify(report, null, 2));
    console.log(`✅ Updated .audit/latest-audit.json`);
  } catch (error) {
    console.warn('⚠️ Could not create latest symlink:', error.message);
  }
  
  // Print summary to console
  console.log('\n📋 AUDIT SUMMARY');
  console.log('================');
  console.log(`Tables: ${summary.summary.total_tables}`);
  console.log(`Total Rows: ${summary.summary.total_rows.toLocaleString()}`);
  console.log(`Total Size: ${summary.summary.total_size_mb} MB`);
  console.log(`RLS Policies: ${summary.summary.total_policies}`);
  console.log(`Functions: ${summary.summary.total_functions}`);
  console.log(`Triggers: ${summary.summary.total_triggers}`);
  console.log(`Views: ${summary.summary.total_views}`);
  
  if (summary.largest_tables.length > 0) {
    console.log('\n🏆 LARGEST TABLES');
    console.log('=================');
    summary.largest_tables.forEach((table, i) => {
      console.log(`${i + 1}. ${table.name}: ${table.rows.toLocaleString()} rows, ${table.size_mb} MB`);
    });
  }
  
  console.log(`\n✅ Audit complete! Reports saved to .audit/ directory`);
}

// Create _deprecated schema for quarantine
console.log('🛡️ Creating quarantine schema...');
try {
  execSync(`psql "${DATABASE_URL}" -c "CREATE SCHEMA IF NOT EXISTS _deprecated;"`, { encoding: 'utf8' });
  console.log('✅ _deprecated schema ready for quarantine operations');
} catch (error) {
  console.warn('⚠️ Could not create _deprecated schema:', error.message);
}

main().catch(console.error);
