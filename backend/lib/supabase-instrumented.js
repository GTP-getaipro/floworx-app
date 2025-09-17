/**
 * Instrumented Supabase Client
 * 
 * Wraps the standard Supabase client to log usage of tables and RPC functions
 * for dynamic analysis of what's actually being used in production.
 * 
 * Usage: Replace regular supabase imports with this instrumented version
 * 
 * Environment Variables:
 * - USAGE_AUDIT=true/false (default: true in staging, false in prod)
 * - DATABASE_URL: for logging usage data
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

class SupabaseInstrumented {
  constructor(supabaseUrl, supabaseKey, options = {}) {
    // Create the actual Supabase client
    this.client = createClient(supabaseUrl, supabaseKey, options);
    
    // Usage tracking configuration
    this.auditEnabled = process.env.USAGE_AUDIT !== 'false'; // Default true
    this.auditClient = null;
    
    // Initialize audit database connection if enabled
    if (this.auditEnabled && process.env.DATABASE_URL) {
      this.initializeAudit();
    }
    
    // Bind methods to preserve context
    this.from = this.from.bind(this);
    this.rpc = this.rpc.bind(this);
    this.storage = this.storage;
    
    // Proxy other methods directly
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        return target.client[prop];
      }
    });
  }
  
  async initializeAudit() {
    try {
      this.auditClient = new Client({
        connectionString: process.env.DATABASE_URL
      });
      
      await this.auditClient.connect();
      
      // Create audit table if it doesn't exist
      await this.auditClient.query(`
        CREATE SCHEMA IF NOT EXISTS _ops;
        
        CREATE TABLE IF NOT EXISTS _ops.usage_audit (
          id bigserial primary key,
          ts timestamptz default now(),
          kind text,            -- 'table' | 'rpc' | 'storage'
          target text,          -- table name, function name, or bucket name
          route text,           -- optional: API route or context
          user_id uuid null,    -- if available from context
          session_id text null, -- for grouping related operations
          metadata jsonb null   -- additional context
        );
        
        CREATE INDEX IF NOT EXISTS idx_usage_audit_ts ON _ops.usage_audit(ts);
        CREATE INDEX IF NOT EXISTS idx_usage_audit_kind_target ON _ops.usage_audit(kind, target);
      `);
      
      console.log('✅ Usage audit system initialized');
    } catch (error) {
      console.warn('⚠️ Could not initialize usage audit:', error.message);
      this.auditEnabled = false;
    }
  }
  
  async logUsage(kind, target, context = {}) {
    if (!this.auditEnabled || !this.auditClient) return;
    
    try {
      // Extract context information
      const route = context.route || this.getCurrentRoute();
      const userId = context.userId || this.getCurrentUserId();
      const sessionId = context.sessionId || this.getCurrentSessionId();
      
      await this.auditClient.query(`
        INSERT INTO _ops.usage_audit (kind, target, route, user_id, session_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        kind,
        target,
        route,
        userId,
        sessionId,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          ...context
        })
      ]);
    } catch (error) {
      // Don't let audit logging break the application
      console.warn('⚠️ Usage audit logging failed:', error.message);
    }
  }
  
  // Instrumented from() method
  from(table) {
    // Log the table access
    this.logUsage('table', table, {
      operation: 'from',
      stack: this.getCallStack()
    });
    
    // Return the actual Supabase query builder
    const queryBuilder = this.client.from(table);
    
    // Wrap common query methods to log more specific operations
    return this.wrapQueryBuilder(queryBuilder, table);
  }
  
  // Instrumented rpc() method
  async rpc(functionName, params = {}, options = {}) {
    // Log the RPC call
    this.logUsage('rpc', functionName, {
      operation: 'rpc',
      paramCount: Object.keys(params).length,
      stack: this.getCallStack()
    });
    
    // Execute the actual RPC call
    return this.client.rpc(functionName, params, options);
  }
  
  // Wrap query builder to log specific operations
  wrapQueryBuilder(queryBuilder, tableName) {
    const originalMethods = ['select', 'insert', 'update', 'delete', 'upsert'];
    
    originalMethods.forEach(method => {
      if (typeof queryBuilder[method] === 'function') {
        const originalMethod = queryBuilder[method].bind(queryBuilder);
        queryBuilder[method] = (...args) => {
          // Log the specific operation
          this.logUsage('table', tableName, {
            operation: method,
            argCount: args.length,
            stack: this.getCallStack()
          });
          
          return originalMethod(...args);
        };
      }
    });
    
    return queryBuilder;
  }
  
  // Get current route from Express request (if available)
  getCurrentRoute() {
    try {
      // Try to get route from Express request context
      const asyncHooks = require('async_hooks');
      // This is a simplified approach - in practice you might use
      // cls-hooked or similar for request context tracking
      return process.env.CURRENT_ROUTE || 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  // Get current user ID from context
  getCurrentUserId() {
    try {
      // This would typically come from JWT token or session
      return process.env.CURRENT_USER_ID || null;
    } catch {
      return null;
    }
  }
  
  // Get current session ID
  getCurrentSessionId() {
    try {
      return process.env.CURRENT_SESSION_ID || null;
    } catch {
      return null;
    }
  }
  
  // Get call stack for debugging
  getCallStack() {
    try {
      const stack = new Error().stack;
      return stack.split('\n').slice(2, 5).join(' | '); // Get relevant stack frames
    } catch {
      return 'unknown';
    }
  }
  
  // Storage access (instrumented)
  get storage() {
    const originalStorage = this.client.storage;
    
    return {
      from: (bucketName) => {
        this.logUsage('storage', bucketName, {
          operation: 'storage_from',
          stack: this.getCallStack()
        });
        
        return originalStorage.from(bucketName);
      },
      
      // Proxy other storage methods
      ...originalStorage
    };
  }
  
  // Method to get usage statistics
  async getUsageStats(days = 7) {
    if (!this.auditClient) {
      throw new Error('Usage audit not initialized');
    }
    
    const result = await this.auditClient.query(`
      SELECT 
        kind,
        target,
        count(*) as calls,
        max(ts) as last_used,
        min(ts) as first_used,
        count(distinct user_id) as unique_users
      FROM _ops.usage_audit 
      WHERE ts >= now() - interval '${days} days'
      GROUP BY kind, target
      ORDER BY calls DESC
    `);
    
    return result.rows;
  }
  
  // Method to export usage data
  async exportUsageData(days = 7) {
    if (!this.auditClient) {
      throw new Error('Usage audit not initialized');
    }
    
    const result = await this.auditClient.query(`
      SELECT * FROM _ops.usage_audit 
      WHERE ts >= now() - interval '${days} days'
      ORDER BY ts DESC
    `);
    
    return result.rows;
  }
  
  // Cleanup method
  async cleanup() {
    if (this.auditClient) {
      await this.auditClient.end();
    }
  }
}

// Factory function to create instrumented client
function createInstrumentedClient(supabaseUrl, supabaseKey, options = {}) {
  return new SupabaseInstrumented(supabaseUrl, supabaseKey, options);
}

module.exports = {
  createClient: createInstrumentedClient,
  SupabaseInstrumented
};
