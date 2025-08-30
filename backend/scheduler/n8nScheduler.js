const cron = require('node-cron');
const axios = require('axios');
const express = require('express');
const { pool } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

class N8nScheduler {
  constructor() {
    this.isRunning = false;
    this.task = null;
  }

  // Get all users with active Google credentials
  async getActiveUsers() {
    try {
      const query = `
        SELECT DISTINCT u.id, u.email, c.created_at as connected_at
        FROM users u
        INNER JOIN credentials c ON u.id = c.user_id
        WHERE c.service_name = 'google'
        AND (c.expiry_date IS NULL OR c.expiry_date > CURRENT_TIMESTAMP)
        ORDER BY u.created_at ASC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching active users:', error);
      return [];
    }
  }

  // Trigger n8n webhook for a specific user
  async triggerN8nWebhook(userId, userEmail) {
    try {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      
      if (!webhookUrl) {
        console.warn('N8N_WEBHOOK_URL not configured, skipping webhook trigger');
        return false;
      }

      const payload = {
        userId: userId,
        email: userEmail,
        timestamp: new Date().toISOString(),
        source: 'floworx-scheduler'
      };

      const response = await axios.post(webhookUrl, payload, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Floworx-Scheduler/1.0'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ Webhook triggered successfully for user ${userEmail}`);
        return true;
      } else {
        console.warn(`⚠️ Webhook returned status ${response.status} for user ${userEmail}`);
        return false;
      }

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error(`⏰ Webhook timeout for user ${userEmail}`);
      } else if (error.response) {
        console.error(`❌ Webhook error for user ${userEmail}:`, error.response.status, error.response.data);
      } else {
        console.error(`❌ Webhook network error for user ${userEmail}:`, error.message);
      }
      return false;
    }
  }

  // Main scheduler function that runs every 5 minutes
  async runScheduledTask() {
    if (this.isRunning) {
      console.log('⏳ Previous scheduler task still running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log(`🚀 Starting scheduled task at ${startTime.toISOString()}`);
      
      // Get all active users
      const activeUsers = await this.getActiveUsers();
      console.log(`📊 Found ${activeUsers.length} active users with Google connections`);

      if (activeUsers.length === 0) {
        console.log('ℹ️ No active users found, nothing to process');
        return;
      }

      // Process each user
      let successCount = 0;
      let errorCount = 0;

      for (const user of activeUsers) {
        try {
          const success = await this.triggerN8nWebhook(user.id, user.email);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
          
          // Small delay between requests to avoid overwhelming n8n
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error processing user ${user.email}:`, error);
          errorCount++;
        }
      }

      const endTime = new Date();
      const duration = endTime - startTime;
      
      console.log(`✅ Scheduled task completed in ${duration}ms`);
      console.log(`📈 Results: ${successCount} successful, ${errorCount} errors`);

    } catch (error) {
      console.error('❌ Scheduler task failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Start the scheduler (runs every 5 minutes)
  start() {
    if (this.task) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    // Cron expression: every 5 minutes
    // Format: second minute hour day month dayOfWeek
    this.task = cron.schedule('0 */5 * * * *', () => {
      this.runScheduledTask();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.task.start();
    console.log('🕐 N8n scheduler started - running every 5 minutes');
  }

  // Stop the scheduler
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('🛑 N8n scheduler stopped');
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.task ? this.task.getStatus() : false,
      nextRun: this.task ? 'Every 5 minutes' : 'Not scheduled'
    };
  }

  // Manual trigger for testing
  async triggerManually() {
    console.log('🔧 Manual scheduler trigger initiated');
    await this.runScheduledTask();
  }
}

// Create singleton instance
const scheduler = new N8nScheduler();

// GET /api/scheduler/status
// Get scheduler status (for monitoring)
router.get('/status', authenticateToken, (req, res) => {
  res.json({
    scheduler: scheduler.getStatus(),
    timestamp: new Date().toISOString()
  });
});

// POST /api/scheduler/trigger
// Manually trigger scheduler (for testing)
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    await scheduler.triggerManually();
    res.json({
      message: 'Scheduler triggered manually',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({
      error: 'Manual trigger failed',
      message: error.message
    });
  }
});

module.exports = {
  router,
  scheduler
};
