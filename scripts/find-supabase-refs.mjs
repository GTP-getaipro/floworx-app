#!/usr/bin/env node

/**
 * Static Supabase Reference Scanner
 * 
 * Scans codebase for Supabase table and RPC function references
 * to identify which database objects are actually used in code.
 * 
 * Searches for patterns like:
 * - supabase.from('table_name')
 * - .from('table_name')
 * - supabase.rpc('function_name')
 * - .rpc('function_name')
 * 
 * Usage: node scripts/find-supabase-refs.mjs
 * Output: .audit/static-refs.json
 */

import { globby } from 'globby';
import { readFile, writeFileSync, mkdirSync } from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);

// Ensure audit directory exists
mkdirSync('.audit', { recursive: true });

// Regex patterns to find Supabase references
const patterns = {
  // .from('table_name') or supabase.from('table_name')
  table: /(?:supabase\.)?from\s*\(\s*['"`]([\w.-]+)['"`]\s*\)/g,
  
  // .rpc('function_name') or supabase.rpc('function_name')
  rpc: /(?:supabase\.)?rpc\s*\(\s*['"`]([\w.-]+)['"`]\s*\)/g,
  
  // Additional patterns for different usage styles
  select: /\.select\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  insert: /\.insert\s*\(\s*\{[^}]*\}\s*\)\.into\s*\(\s*['"`]([\w.-]+)['"`]\s*\)/g,
  update: /\.update\s*\(\s*['"`]([\w.-]+)['"`]\s*\)/g,
  delete: /\.delete\s*\(\s*\)\.from\s*\(\s*['"`]([\w.-]+)['"`]\s*\)/g,
  
  // Storage bucket references
  storage: /\.storage\.from\s*\(\s*['"`]([\w.-]+)['"`]\s*\)/g,
  
  // Direct SQL queries (less common but possible)
  sql: /\.sql\s*\(\s*['"`]([^'"`]*(?:FROM|JOIN|INTO|UPDATE)\s+[\w.]+[^'"`]*)['"`]\s*\)/gi
};

console.log('🔍 Scanning codebase for Supabase references...');

async function scanFiles() {
  // Find all relevant files
  const files = await globby([
    '**/*.{ts,tsx,js,jsx,mjs,cjs}',
    '!node_modules/**',
    '!dist/**',
    '!build/**',
    '!coverage/**',
    '!.git/**',
    '!.audit/**',
    '!backups/**'
  ]);

  console.log(`📁 Found ${files.length} files to scan`);

  const results = {
    tables: new Set(),
    rpcs: new Set(),
    storage_buckets: new Set(),
    sql_references: new Set(),
    hits: []
  };

  let filesScanned = 0;
  let totalHits = 0;

  for (const file of files) {
    try {
      const content = await readFileAsync(file, 'utf8');
      filesScanned++;
      
      // Scan for each pattern type
      for (const [type, regex] of Object.entries(patterns)) {
        let match;
        const globalRegex = new RegExp(regex.source, regex.flags);
        
        while ((match = globalRegex.exec(content)) !== null) {
          const reference = match[1];
          if (!reference) continue;
          
          totalHits++;
          
          // Categorize the reference
          if (type === 'rpc') {
            results.rpcs.add(reference);
            results.hits.push({
              file,
              type: 'rpc',
              name: reference,
              line: getLineNumber(content, match.index),
              context: getContext(content, match.index)
            });
          } else if (type === 'storage') {
            results.storage_buckets.add(reference);
            results.hits.push({
              file,
              type: 'storage_bucket',
              name: reference,
              line: getLineNumber(content, match.index),
              context: getContext(content, match.index)
            });
          } else if (type === 'sql') {
            // Extract table names from SQL
            const sqlTables = extractTablesFromSQL(reference);
            sqlTables.forEach(table => {
              results.tables.add(table);
              results.sql_references.add(reference);
            });
            results.hits.push({
              file,
              type: 'sql',
              name: reference,
              line: getLineNumber(content, match.index),
              context: getContext(content, match.index)
            });
          } else {
            // Table reference
            results.tables.add(reference);
            results.hits.push({
              file,
              type: 'table',
              name: reference,
              line: getLineNumber(content, match.index),
              context: getContext(content, match.index)
            });
          }
        }
      }
      
      if (filesScanned % 50 === 0) {
        console.log(`📊 Scanned ${filesScanned}/${files.length} files...`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not read ${file}:`, error.message);
    }
  }

  return {
    tables: Array.from(results.tables).sort(),
    rpcs: Array.from(results.rpcs).sort(),
    storage_buckets: Array.from(results.storage_buckets).sort(),
    sql_references: Array.from(results.sql_references).sort(),
    hits: results.hits,
    stats: {
      files_scanned: filesScanned,
      total_files: files.length,
      total_hits: totalHits,
      unique_tables: results.tables.size,
      unique_rpcs: results.rpcs.size,
      unique_storage_buckets: results.storage_buckets.size
    }
  };
}

// Get line number for a character index
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// Get context around a match
function getContext(content, index, contextLength = 50) {
  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + contextLength);
  return content.substring(start, end).replace(/\n/g, ' ').trim();
}

// Extract table names from SQL queries (basic implementation)
function extractTablesFromSQL(sql) {
  const tables = new Set();
  const tableRegex = /(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi;
  let match;
  
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    // Skip common SQL keywords
    if (!['select', 'where', 'order', 'group', 'having', 'limit'].includes(tableName)) {
      tables.add(tableName);
    }
  }
  
  return Array.from(tables);
}

// Generate summary report
function generateSummary(results) {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      files_scanned: results.stats.files_scanned,
      total_references: results.stats.total_hits,
      unique_tables: results.stats.unique_tables,
      unique_rpcs: results.stats.unique_rpcs,
      unique_storage_buckets: results.stats.unique_storage_buckets
    },
    most_referenced_tables: getMostReferenced(results.hits, 'table'),
    most_referenced_rpcs: getMostReferenced(results.hits, 'rpc'),
    files_with_most_references: getFilesWithMostReferences(results.hits)
  };
}

// Get most referenced items by type
function getMostReferenced(hits, type) {
  const counts = {};
  hits.filter(hit => hit.type === type).forEach(hit => {
    counts[hit.name] = (counts[hit.name] || 0) + 1;
  });
  
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

// Get files with most references
function getFilesWithMostReferences(hits) {
  const counts = {};
  hits.forEach(hit => {
    counts[hit.file] = (counts[hit.file] || 0) + 1;
  });
  
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
}

// Main execution
async function main() {
  try {
    const results = await scanFiles();
    const summary = generateSummary(results);
    
    const report = {
      ...summary,
      data: results
    };
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeFileSync(`.audit/static-refs-${timestamp}.json`, JSON.stringify(report, null, 2));
    writeFileSync('.audit/static-refs.json', JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📋 STATIC REFERENCE ANALYSIS');
    console.log('============================');
    console.log(`Files scanned: ${results.stats.files_scanned}`);
    console.log(`Total references: ${results.stats.total_hits}`);
    console.log(`Unique tables: ${results.stats.unique_tables}`);
    console.log(`Unique RPCs: ${results.stats.unique_rpcs}`);
    console.log(`Storage buckets: ${results.stats.unique_storage_buckets}`);
    
    if (results.tables.length > 0) {
      console.log('\n📊 REFERENCED TABLES');
      console.log('====================');
      results.tables.forEach(table => console.log(`- ${table}`));
    }
    
    if (results.rpcs.length > 0) {
      console.log('\n🔧 REFERENCED RPCS');
      console.log('==================');
      results.rpcs.forEach(rpc => console.log(`- ${rpc}`));
    }
    
    console.log(`\n✅ Static analysis complete! Report saved to .audit/static-refs.json`);
    
  } catch (error) {
    console.error('❌ Error during static analysis:', error);
    process.exit(1);
  }
}

main();
