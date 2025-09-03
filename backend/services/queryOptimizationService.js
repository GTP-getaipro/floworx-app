/**
 * Query Optimization Service
 * Implements advanced caching, query batching, and performance monitoring
 */

const { query } = require('../database/unified-connection');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

class QueryOptimizationService {
  constructor() {
    this.queryCache = new Map();
    this.batchQueue = new Map();
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      batchedQueries: 0,
      optimizedQueries: 0
    };
  }

  /**
   * Execute query with automatic optimization
   */
  async executeOptimized(queryText, params = [], options = {}) {
    const {
      cache = true,
      cacheTTL = 300, // 5 minutes default
      batch = false,
      batchKey = null
    } = options;

    // Generate cache key
    const cacheKey = this.generateCacheKey(queryText, params);

    // Try cache first if enabled
    if (cache) {
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.metrics.cacheHits++;
        return cachedResult;
      }
      this.metrics.cacheMisses++;
    }

    // Execute query
    const result = await this.executeQuery(queryText, params);

    // Cache result if enabled
    if (cache && result) {
      await this.cacheResult(cacheKey, result, cacheTTL);
    }

    this.metrics.optimizedQueries++;
    return result;
  }

  /**
   * Batch multiple queries for efficiency
   */
  async executeBatch(queries) {
    const results = [];
    const startTime = Date.now();

    try {
      // Execute all queries in parallel where possible
      const promises = queries.map(async ({ queryText, params, options = {} }) => {
        return await this.executeOptimized(queryText, params, options);
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      const duration = Date.now() - startTime;
      this.metrics.batchedQueries++;
      
      logger.info('Batch query executed', {
        queryCount: queries.length,
        duration,
        cacheHitRate: this.getCacheHitRate()
      });

      return results;
    } catch (error) {
      logger.error('Batch query failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Optimize user-related queries with smart caching
   */
  async getUserWithRelatedData(userId) {
    const cacheKey = `user:full:${userId}`;
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    // Execute optimized query with JOINs to reduce N+1 queries
    const queryText = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.company_name,
        u.email_verified, u.onboarding_completed, u.subscription_status,
        u.created_at, u.updated_at,
        
        -- Credentials data
        c.service_name, c.access_token, c.refresh_token, c.expiry_date,
        
        -- Business categories
        bc.id as category_id, bc.category_name, bc.description,
        
        -- Workflow deployments
        wd.id as workflow_id, wd.workflow_name, wd.workflow_status,
        wd.deployed_at
        
      FROM users u
      LEFT JOIN credentials c ON u.id = c.user_id
      LEFT JOIN business_categories bc ON u.id = bc.user_id
      LEFT JOIN workflow_deployments wd ON u.id = wd.user_id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;

    try {
      const result = await query(queryText, [userId]);
      
      // Transform flat result into structured data
      const userData = this.transformUserData(result.rows);
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, userData, 600);
      this.metrics.cacheMisses++;
      
      return userData;
    } catch (error) {
      logger.error('Failed to get user with related data', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Optimize onboarding queries
   */
  async getOnboardingProgress(userId) {
    const cacheKey = `onboarding:${userId}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    const queryText = `
      SELECT 
        uos.step_completed,
        uos.step_data,
        uos.completed_at,
        u.onboarding_completed,
        COUNT(bc.id) as business_categories_count,
        COUNT(clm.id) as label_mappings_count,
        COUNT(tn.id) as team_members_count,
        COUNT(wd.id) as workflows_count
      FROM users u
      LEFT JOIN user_onboarding_status uos ON u.id = uos.user_id
      LEFT JOIN business_categories bc ON u.id = bc.user_id
      LEFT JOIN category_label_mappings clm ON u.id = clm.user_id
      LEFT JOIN team_notifications tn ON u.id = tn.user_id
      LEFT JOIN workflow_deployments wd ON u.id = wd.user_id
      WHERE u.id = $1
      GROUP BY u.id, uos.step_completed, uos.step_data, uos.completed_at, u.onboarding_completed
      ORDER BY uos.completed_at DESC
    `;

    try {
      const result = await query(queryText, [userId]);
      const progress = this.transformOnboardingData(result.rows);
      
      // Cache for 5 minutes (shorter TTL for dynamic data)
      await cacheService.set(cacheKey, progress, 300);
      this.metrics.cacheMisses++;
      
      return progress;
    } catch (error) {
      logger.error('Failed to get onboarding progress', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate cache key from query and parameters
   */
  generateCacheKey(queryText, params) {
    const queryHash = require('crypto')
      .createHash('md5')
      .update(queryText + JSON.stringify(params))
      .digest('hex');
    return `query:${queryHash}`;
  }

  /**
   * Get cached result
   */
  async getCachedResult(cacheKey) {
    try {
      return await cacheService.get(cacheKey);
    } catch (error) {
      logger.warn('Cache get failed', { cacheKey, error: error.message });
      return null;
    }
  }

  /**
   * Cache query result
   */
  async cacheResult(cacheKey, result, ttl) {
    try {
      await cacheService.set(cacheKey, result, ttl);
    } catch (error) {
      logger.warn('Cache set failed', { cacheKey, error: error.message });
    }
  }

  /**
   * Execute query with performance monitoring
   */
  async executeQuery(queryText, params) {
    const startTime = Date.now();
    
    try {
      const result = await query(queryText, params);
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          duration,
          query: queryText.substring(0, 100),
          paramCount: params.length
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query execution failed', {
        duration,
        query: queryText.substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Transform flat user data into structured format
   */
  transformUserData(rows) {
    if (!rows.length) {return null;}

    const user = {
      id: rows[0].id,
      email: rows[0].email,
      firstName: rows[0].first_name,
      lastName: rows[0].last_name,
      companyName: rows[0].company_name,
      emailVerified: rows[0].email_verified,
      onboardingCompleted: rows[0].onboarding_completed,
      subscriptionStatus: rows[0].subscription_status,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
      credentials: [],
      businessCategories: [],
      workflows: []
    };

    // Group related data
    const credentialsMap = new Map();
    const categoriesMap = new Map();
    const workflowsMap = new Map();

    rows.forEach(row => {
      // Credentials
      if (row.service_name && !credentialsMap.has(row.service_name)) {
        credentialsMap.set(row.service_name, {
          serviceName: row.service_name,
          accessToken: row.access_token,
          refreshToken: row.refresh_token,
          expiryDate: row.expiry_date
        });
      }

      // Business categories
      if (row.category_id && !categoriesMap.has(row.category_id)) {
        categoriesMap.set(row.category_id, {
          id: row.category_id,
          name: row.category_name,
          description: row.description
        });
      }

      // Workflows
      if (row.workflow_id && !workflowsMap.has(row.workflow_id)) {
        workflowsMap.set(row.workflow_id, {
          id: row.workflow_id,
          name: row.workflow_name,
          status: row.workflow_status,
          deployedAt: row.deployed_at
        });
      }
    });

    user.credentials = Array.from(credentialsMap.values());
    user.businessCategories = Array.from(categoriesMap.values());
    user.workflows = Array.from(workflowsMap.values());

    return user;
  }

  /**
   * Transform onboarding data
   */
  transformOnboardingData(rows) {
    if (!rows.length) {return { completed: false, steps: [], summary: {} };}

    const steps = rows.map(row => ({
      step: row.step_completed,
      data: row.step_data,
      completedAt: row.completed_at
    }));

    const summary = {
      businessCategoriesCount: parseInt(rows[0].business_categories_count) || 0,
      labelMappingsCount: parseInt(rows[0].label_mappings_count) || 0,
      teamMembersCount: parseInt(rows[0].team_members_count) || 0,
      workflowsCount: parseInt(rows[0].workflows_count) || 0
    };

    return {
      completed: rows[0].onboarding_completed,
      steps,
      summary
    };
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? (this.metrics.cacheHits / total) : 0;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.getCacheHitRate()
    };
  }

  /**
   * Clear cache for specific patterns
   */
  async invalidateCache(pattern) {
    try {
      await cacheService.deletePattern(pattern);
      logger.info('Cache invalidated', { pattern });
    } catch (error) {
      logger.error('Cache invalidation failed', { pattern, error: error.message });
    }
  }
}

// Export singleton instance
const queryOptimizationService = new QueryOptimizationService();
module.exports = queryOptimizationService;
