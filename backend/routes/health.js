/**
 * Comprehensive Health Check Endpoints
 * Provides detailed system health monitoring for production
 */

const express = require('express');
const Redis = require('ioredis');

const { databaseOperations } = require('../database/database-operations');
const ContainerMemoryMonitor = require('../utils/ContainerMemoryMonitor');

const router = express.Router();

// Create memory monitor for health checks
const healthMemoryMonitor = new ContainerMemoryMonitor({
  enableLogging: false // Health checks shouldn't spam logs
});

// Basic health check
router.get('/', (req, res) => {
  try {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0'
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Database health check
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now();

    // Test database connection
    const healthResult = await databaseOperations.healthCheck();
    const connectionInfo = databaseOperations.getConnectionInfo();

    const responseTime = Date.now() - startTime;
    
    if (healthResult.success) {
      res.status(200).json({
        status: 'healthy',
        service: 'database',
        responseTime: `${responseTime}ms`,
        connection: 'active',
        method: connectionInfo.connectionMethod,
        timestamp: healthResult.timestamp || new Date().toISOString(),
        details: {
          type: connectionInfo.useRestApi ? 'Supabase REST API' : 'PostgreSQL',
          connection_method: connectionInfo.connectionMethod,
          initialized: connectionInfo.isInitialized,
          test_result: 'passed'
        }
      });
    } else {
      throw new Error(healthResult.error || 'Database health check failed');
    }
  } catch (error) {
    const connectionInfo = databaseOperations.getConnectionInfo();
    res.status(503).json({
      status: 'unhealthy',
      service: 'database',
      error: error.message,
      method: connectionInfo.connectionMethod,
      details: {
        type: connectionInfo.useRestApi ? 'Supabase REST API' : 'PostgreSQL',
        connection_method: connectionInfo.connectionMethod,
        initialized: connectionInfo.isInitialized,
        connection: 'failed'
      }
    });
  }
});

// Redis/KeyDB health check
router.get('/cache', async (req, res) => {
  let redis = null;
  
  try {
    const startTime = Date.now();
    
    // Try to connect to Redis/KeyDB
    const redisConfig = process.env.REDIS_URL || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 5000,
      commandTimeout: 3000,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    };
    
    redis = new Redis(redisConfig);
    await redis.connect();
    
    // Test basic operations
    const testKey = `health_check_${Date.now()}`;
    await redis.set(testKey, 'test_value', 'EX', 10);
    const testValue = await redis.get(testKey);
    await redis.del(testKey);
    
    const responseTime = Date.now() - startTime;
    
    await redis.disconnect();
    
    res.status(200).json({
      status: 'healthy',
      service: 'cache',
      responseTime: `${responseTime}ms`,
      connection: 'active',
      details: {
        type: 'Redis/KeyDB',
        operations: 'set/get/del successful',
        test_result: testValue === 'test_value' ? 'passed' : 'failed'
      }
    });
  } catch (error) {
    if (redis) {
      try {
        await redis.disconnect();
      } catch (_e) {
        // Ignore disconnect errors
      }
    }
    
    res.status(503).json({
      status: 'unhealthy',
      service: 'cache',
      error: error.message,
      fallback: 'memory_cache_active',
      details: {
        type: 'Redis/KeyDB',
        connection: 'failed',
        impact: 'Using memory cache fallback'
      }
    });
  }
});

// Email service health check
router.get('/email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const startTime = Date.now();
    
    // Create transporter with current config
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // Verify SMTP connection
    await transporter.verify();
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: 'healthy',
      service: 'email',
      responseTime: `${responseTime}ms`,
      connection: 'verified',
      details: {
        smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtp_port: process.env.SMTP_PORT || '587',
        from_email: process.env.FROM_EMAIL || process.env.SMTP_USER,
        auth_configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'email',
      error: error.message,
      details: {
        smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
        connection: 'failed'
      }
    });
  }
});

// Memory health check with container awareness
router.get('/memory', (req, res) => {
  try {
    const stats = healthMemoryMonitor.getMemoryStats();
    const summary = healthMemoryMonitor.getMemorySummary();
    const trend = healthMemoryMonitor.getMemoryTrend(5); // 5 minute trend

    const statusCode = summary.status === 'healthy' ? 200 :
                      summary.status === 'warning' ? 206 : 503;

    res.status(statusCode).json({
      status: summary.status,
      service: 'memory',
      usage: summary.usage,
      trend: trend,
      details: {
        environment: {
          container: stats.container.isContainer,
          cgroup_version: stats.container.cgroupVersion,
          node_version: process.version
        },
        memory_breakdown: {
          process_rss: `${stats.process.rssMB}MB`,
          heap_used: `${stats.heap.usedHeapSizeMB}MB`,
          heap_limit: `${stats.heap.heapSizeLimitMB}MB`,
          container_limit: stats.container.limitMB ? `${stats.container.limitMB}MB` : 'unlimited',
          system_total: `${stats.system.totalMB}MB`
        },
        thresholds: {
          warning: `${healthMemoryMonitor.options.warningThreshold}%`,
          critical: `${healthMemoryMonitor.options.criticalThreshold}%`,
          emergency: `${healthMemoryMonitor.options.emergencyThreshold}%`
        },
        recommendations: summary.recommendations
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'memory',
      error: error.message
    });
  }
});

// OAuth service health check
router.get('/oauth', (req, res) => {
  try {
    const oauthConfig = {
      google_client_id: Boolean(process.env.GOOGLE_CLIENT_ID),
      google_client_secret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      google_redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      frontend_url: process.env.FRONTEND_URL
    };
    
    const isConfigured = oauthConfig.google_client_id && 
                        oauthConfig.google_client_secret && 
                        oauthConfig.google_redirect_uri;
    
    if (isConfigured) {
      res.status(200).json({
        status: 'healthy',
        service: 'oauth',
        configuration: 'complete',
        details: {
          google_oauth: 'configured',
          redirect_uri: oauthConfig.google_redirect_uri,
          frontend_url: oauthConfig.frontend_url
        }
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        service: 'oauth',
        configuration: 'incomplete',
        missing: [
          !oauthConfig.google_client_id && 'GOOGLE_CLIENT_ID',
          !oauthConfig.google_client_secret && 'GOOGLE_CLIENT_SECRET',
          !oauthConfig.google_redirect_uri && 'GOOGLE_REDIRECT_URI'
        ].filter(Boolean),
        details: {
          google_oauth: 'not_configured'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'oauth',
      error: error.message
    });
  }
});

// Comprehensive system health check
router.get('/system', async (req, res) => {
  const checks = [];
  let overallStatus = 'healthy';
  
  try {
    // Database check
    try {
      await query('SELECT 1');
      checks.push({ service: 'database', status: 'healthy' });
    } catch (error) {
      checks.push({ service: 'database', status: 'unhealthy', error: error.message });
      overallStatus = 'degraded';
    }
    
    // Cache check
    let redis = null;
    try {
      const redisConfig = process.env.REDIS_URL || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 2000,
        commandTimeout: 1000,
        lazyConnect: true,
        maxRetriesPerRequest: 1
      };
      
      redis = new Redis(redisConfig);
      await redis.connect();
      await redis.ping();
      await redis.disconnect();
      
      checks.push({ service: 'cache', status: 'healthy' });
    } catch (error) {
      if (redis) {
        try {
          await redis.disconnect();
        } catch (_e) {
          // Ignore disconnect errors during cleanup
        }
      }
      checks.push({ service: 'cache', status: 'degraded', error: error.message, fallback: 'memory_cache' });
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }
    
    // Email check
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      await transporter.verify();
      checks.push({ service: 'email', status: 'healthy' });
    } catch (error) {
      checks.push({ service: 'email', status: 'unhealthy', error: error.message });
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }
    
    // OAuth check
    const oauthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && 
                              process.env.GOOGLE_CLIENT_SECRET && 
                              process.env.GOOGLE_REDIRECT_URI);
    
    checks.push({ 
      service: 'oauth', 
      status: oauthConfigured ? 'healthy' : 'not_configured',
      configured: oauthConfigured
    });
    
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: checks,
      summary: {
        total: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        degraded: checks.filter(c => c.status === 'degraded').length,
        unhealthy: checks.filter(c => c.status === 'unhealthy').length
      }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      checks: checks
    });
  }
});

module.exports = router;
