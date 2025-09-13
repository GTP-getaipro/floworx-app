/**
 * Environment Variables Check Endpoint
 * TEMPORARY - For debugging environment variable issues
 */

const express = require('express');
const router = express.Router();

// GET /api/env-check
// Check which environment variables are available (TEMPORARY - REMOVE AFTER DEBUGGING)
router.get('/', (req, res) => {
  try {
    const envCheck = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      variables: {
        // Database
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
        
        // Supabase
        SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
        
        // Security
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'SET' : 'MISSING',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
        SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'MISSING',
        
        // OAuth
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
        GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ? 'SET' : 'MISSING',
        
        // Email
        SMTP_HOST: process.env.SMTP_HOST ? 'SET' : 'MISSING',
        SMTP_PORT: process.env.SMTP_PORT ? 'SET' : 'MISSING',
        SMTP_USER: process.env.SMTP_USER ? 'SET' : 'MISSING',
        SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'MISSING',
        FROM_EMAIL: process.env.FROM_EMAIL ? 'SET' : 'MISSING',
        FROM_NAME: process.env.FROM_NAME ? 'SET' : 'MISSING',
        
        // n8n
        N8N_API_KEY: process.env.N8N_API_KEY ? 'SET' : 'MISSING',
        N8N_BASE_URL: process.env.N8N_BASE_URL ? 'SET' : 'MISSING',
        
        // Other
        PORT: process.env.PORT || '5001',
        FRONTEND_URL: process.env.FRONTEND_URL ? 'SET' : 'MISSING'
      },
      critical_missing: [],
      warnings: []
    };

    // Check for critical missing variables
    const criticalVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'ENCRYPTION_KEY',
      'JWT_SECRET'
    ];

    criticalVars.forEach(varName => {
      if (envCheck.variables[varName] === 'MISSING') {
        envCheck.critical_missing.push(varName);
      }
    });

    // Add warnings for optional but recommended variables
    const recommendedVars = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'SMTP_HOST',
      'N8N_API_KEY'
    ];

    recommendedVars.forEach(varName => {
      if (envCheck.variables[varName] === 'MISSING') {
        envCheck.warnings.push(`${varName} is missing - related features may not work`);
      }
    });

    // Determine overall status
    envCheck.status = envCheck.critical_missing.length === 0 ? 'OK' : 'CRITICAL_MISSING';
    envCheck.ready_for_production = envCheck.critical_missing.length === 0;

    res.status(200).json(envCheck);
  } catch (error) {
    res.status(500).json({
      error: 'Environment check failed',
      message: error.message
    });
  }
});

module.exports = router;
