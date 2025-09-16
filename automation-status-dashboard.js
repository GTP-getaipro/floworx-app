/**
 * Simple Automation Status Dashboard
 * Easy monitoring solution for FloWorx client automations
 */

const express = require('express');
const { authenticateToken } = require('./backend/middleware/auth');
const recoverySystem = require('./n8n-deployment-recovery-system');
const n8nService = require('./backend/services/n8nService');

const router = express.Router();

// GET /api/dashboard/automation-status
// Get current automation status for logged-in user
router.get('/automation-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await recoverySystem.getAutomationStatus(userId);
    
    res.json({
      success: true,
      automation: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Dashboard status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get automation status',
      message: error.message
    });
  }
});

// GET /api/dashboard/recent-activity
// Get recent email processing activity
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const workflows = await n8nService.getUserWorkflows(userId);
    if (workflows.length === 0) {
      return res.json({
        success: true,
        activity: [],
        message: 'No automation deployed yet'
      });
    }

    const workflowId = workflows[0].n8n_workflow_id;
    const executions = await n8nService.getRecentExecutions(workflowId, 24);
    
    // Format activity for dashboard
    const activity = executions.slice(0, limit).map(execution => ({
      id: execution.id,
      status: execution.status,
      startTime: execution.startedAt,
      endTime: execution.stoppedAt,
      duration: execution.stoppedAt ? 
        new Date(execution.stoppedAt) - new Date(execution.startedAt) : null,
      emailsProcessed: execution.data?.emailsProcessed || 0,
      labelsApplied: execution.data?.labelsApplied || 0,
      draftsCreated: execution.data?.draftsCreated || 0
    }));

    res.json({
      success: true,
      activity,
      totalExecutions24h: executions.length,
      lastExecution: executions[0]?.startedAt || null
    });
    
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent activity',
      message: error.message
    });
  }
});

// POST /api/dashboard/test-automation
// Test automation with sample email
router.post('/test-automation', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const workflows = await n8nService.getUserWorkflows(userId);
    if (workflows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No automation deployed',
        message: 'Complete onboarding first to deploy your automation'
      });
    }

    const workflowId = workflows[0].n8n_workflow_id;
    
    // Test with sample email
    const testResult = await recoverySystem.testDeployedWorkflow(workflowId, userId);
    
    res.json({
      success: testResult.success,
      test: testResult,
      message: testResult.success ? 
        'Automation test completed successfully' : 
        'Automation test failed'
    });
    
  } catch (error) {
    console.error('Test automation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test automation',
      message: error.message
    });
  }
});

// Simple HTML Dashboard (for easy client access)
router.get('/status-page', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await recoverySystem.getAutomationStatus(userId);
    
    const statusColors = {
      'active': '#4CAF50',
      'waiting': '#FF9800', 
      'inactive': '#F44336',
      'auth_expired': '#FF5722',
      'not_deployed': '#9E9E9E',
      'error': '#F44336'
    };

    const statusIcons = {
      'active': '✅',
      'waiting': '⏳',
      'inactive': '❌',
      'auth_expired': '🔑',
      'not_deployed': '⚙️',
      'error': '⚠️'
    };

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>FloWorx Automation Status</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .status-card { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .status-icon { font-size: 48px; margin-bottom: 10px; }
            .status-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .status-message { font-size: 16px; margin-bottom: 20px; }
            .action-button { background: #4CAF50; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
            .action-button:hover { background: #45a049; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat { text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #4CAF50; }
            .stat-label { font-size: 14px; color: #666; }
            .refresh-note { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
        <script>
            // Auto-refresh every 30 seconds
            setTimeout(() => window.location.reload(), 30000);
        </script>
    </head>
    <body>
        <div class="container">
            <h1>FloWorx Email Automation</h1>
            
            <div class="status-card" style="background-color: ${statusColors[status.status]}20; border-left: 4px solid ${statusColors[status.status]};">
                <div class="status-icon">${statusIcons[status.status]}</div>
                <div class="status-title" style="color: ${statusColors[status.status]};">${status.status.toUpperCase().replace('_', ' ')}</div>
                <div class="status-message">${status.message}</div>
                
                ${status.action_required ? `
                    <a href="/dashboard" class="action-button">Take Action</a>
                ` : ''}
            </div>

            ${status.executions_24h !== undefined ? `
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${status.executions_24h}</div>
                    <div class="stat-label">Executions (24h)</div>
                </div>
                <div class="stat">
                    <div class="stat-number">5 min</div>
                    <div class="stat-label">Check Interval</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${status.last_execution ? 'Recent' : 'None'}</div>
                    <div class="stat-label">Last Activity</div>
                </div>
            </div>
            ` : ''}

            <div class="refresh-note">
                Page refreshes automatically every 30 seconds<br>
                Last updated: ${new Date().toLocaleString()}
            </div>
        </div>
    </body>
    </html>
    `;

    res.send(html);
    
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>Unable to load automation status: ${error.message}</p>
    `);
  }
});

module.exports = router;
