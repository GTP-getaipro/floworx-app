#!/usr/bin/env node

/**
 * FIX MISSING API ENDPOINTS
 * =========================
 * Add the missing API endpoints that are returning 404
 */

const axios = require('axios');

async function testSpecificEndpoints() {
  console.log('🔍 TESTING SPECIFIC MISSING ENDPOINTS');
  console.log('=====================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // Test the endpoints that should exist based on backend routes
  const endpointsToTest = [
    { path: '/dashboard', method: 'GET', description: 'Dashboard main endpoint' },
    { path: '/dashboard/status', method: 'GET', description: 'Dashboard status (MISSING)' },
    { path: '/onboarding', method: 'GET', description: 'Onboarding main endpoint' },
    { path: '/onboarding/status', method: 'GET', description: 'Onboarding status (MISSING)' },
    { path: '/workflows', method: 'GET', description: 'Workflows main endpoint (MISSING)' },
    { path: '/workflows/status', method: 'GET', description: 'Workflows status' },
    { path: '/analytics', method: 'GET', description: 'Analytics endpoint (MISSING)' },
    { path: '/recovery', method: 'GET', description: 'Recovery endpoint' },
    { path: '/password-reset', method: 'GET', description: 'Password reset endpoint' }
  ];
  
  for (const endpoint of endpointsToTest) {
    try {
      console.log(`\n🧪 Testing: ${endpoint.method} ${endpoint.path}`);
      console.log(`   Description: ${endpoint.description}`);
      
      const response = await axios({
        method: endpoint.method.toLowerCase(),
        url: `${baseUrl}${endpoint.path}`,
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers['content-type'] || 'Not specified'}`);
      
      if (response.status === 404) {
        console.log(`   ❌ MISSING: This endpoint should exist but returns 404`);
      } else if (response.status === 401) {
        console.log(`   ✅ EXISTS: Endpoint exists but requires authentication`);
      } else if (response.status === 200) {
        console.log(`   ✅ WORKING: Endpoint is working correctly`);
      } else {
        console.log(`   ⚠️  Status: ${response.status} - ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

async function checkRouteConflicts() {
  console.log('\n🔍 CHECKING FOR ROUTE CONFLICTS');
  console.log('===============================');
  
  // Check if there are conflicts between backend routes and Vercel API functions
  const potentialConflicts = [
    '/api/dashboard/status',
    '/api/onboarding/status', 
    '/api/workflows',
    '/api/analytics',
    '/api/recovery/initiate'
  ];
  
  for (const route of potentialConflicts) {
    console.log(`\n🔍 Checking: ${route}`);
    
    try {
      const response = await axios.get(`https://app.floworx-iq.com${route}`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 404) {
        console.log(`   ❌ Route not found - needs to be added`);
      } else {
        console.log(`   ✅ Route exists`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function generateMissingEndpointFixes() {
  console.log('\n🔧 GENERATING FIXES FOR MISSING ENDPOINTS');
  console.log('=========================================');
  
  const missingEndpoints = [
    {
      path: '/dashboard/status',
      file: 'backend/routes/dashboard.js',
      fix: `
// GET /api/dashboard/status
// Get dashboard status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get basic user info
    const userQuery = 'SELECT id, email, first_name, last_name FROM users WHERE id = $1';
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }
    
    res.json({
      success: true,
      status: 'active',
      user: userResult.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard status error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard status',
      message: error.message
    });
  }
});`
    },
    {
      path: '/onboarding/status',
      file: 'backend/routes/onboarding.js',
      fix: `
// GET /api/onboarding/status
// Get onboarding status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check onboarding progress
    const progressQuery = 'SELECT * FROM onboarding_progress WHERE user_id = $1';
    const progressResult = await query(progressQuery, [userId]);
    
    const progress = progressResult.rows[0] || {
      user_id: userId,
      current_step: 'welcome',
      completed_steps: [],
      completed: false
    };
    
    res.json({
      success: true,
      onboarding: {
        completed: progress.completed || false,
        currentStep: progress.current_step || 'welcome',
        completedSteps: progress.completed_steps || [],
        progress: ((progress.completed_steps?.length || 0) / 4) * 100
      }
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({
      error: 'Failed to get onboarding status',
      message: error.message
    });
  }
});`
    },
    {
      path: '/workflows',
      file: 'backend/routes/workflows.js',
      fix: `
// GET /api/workflows
// Get user workflows
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user workflows from database
    const workflowsQuery = 'SELECT * FROM user_workflows WHERE user_id = $1';
    const workflowsResult = await query(workflowsQuery, [userId]);
    
    res.json({
      success: true,
      workflows: workflowsResult.rows || [],
      count: workflowsResult.rows?.length || 0
    });
  } catch (error) {
    console.error('Workflows error:', error);
    res.status(500).json({
      error: 'Failed to get workflows',
      message: error.message
    });
  }
});`
    }
  ];
  
  console.log('📋 MISSING ENDPOINTS TO ADD:');
  missingEndpoints.forEach((endpoint, index) => {
    console.log(`\n${index + 1}. ${endpoint.path}`);
    console.log(`   File: ${endpoint.file}`);
    console.log(`   Fix: Add the following route handler:`);
    console.log(endpoint.fix);
  });
  
  return missingEndpoints;
}

async function main() {
  console.log('🔧 FIX MISSING API ENDPOINTS');
  console.log('============================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  await testSpecificEndpoints();
  await checkRouteConflicts();
  const fixes = await generateMissingEndpointFixes();
  
  console.log('\n📊 SUMMARY');
  console.log('==========');
  console.log(`Missing endpoints identified: ${fixes.length}`);
  console.log('These endpoints need to be added to their respective route files.');
  
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Add the missing route handlers to the backend route files');
  console.log('2. Ensure all routes are properly mounted in server.js');
  console.log('3. Test the endpoints after deployment');
  console.log('4. Verify no conflicts with Vercel API functions');
  
  console.log('\n🔧 FIX MISSING API ENDPOINTS COMPLETE!');
}

main().catch(console.error);
