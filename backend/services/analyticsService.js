const { pool } = require('../database/connection');

class AnalyticsService {
  constructor() {
    this.eventTypes = {
      ONBOARDING_STARTED: 'onboarding_started',
      STEP_COMPLETED: 'step_completed',
      STEP_FAILED: 'step_failed',
      STEP_ABANDONED: 'step_abandoned',
      OAUTH_CONNECTED: 'oauth_connected',
      OAUTH_FAILED: 'oauth_failed',
      WORKFLOW_DEPLOYED: 'workflow_deployed',
      WORKFLOW_FAILED: 'workflow_failed',
      ONBOARDING_COMPLETED: 'onboarding_completed',
      USER_CONVERTED: 'user_converted',
      TRIAL_STARTED: 'trial_started',
      TRIAL_EXPIRED: 'trial_expired'
    };
  }

  /**
   * Track an analytics event
   * @param {string} userId - User ID
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @param {Object} metadata - Additional metadata
   */
  async trackEvent(userId, eventType, eventData = {}, metadata = {}) {
    try {
      const query = `
        INSERT INTO analytics_events (
          user_id, event_type, event_data, metadata, session_id, user_agent, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at
      `;

      const result = await pool.query(query, [
        userId,
        eventType,
        JSON.stringify(eventData),
        JSON.stringify(metadata),
        metadata.sessionId || null,
        metadata.userAgent || null,
        metadata.ipAddress || null
      ]);

      // Update user's analytics summary
      await this.updateUserAnalytics(userId, eventType, eventData);

      return {
        success: true,
        eventId: result.rows[0].id,
        timestamp: result.rows[0].created_at
      };
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      throw new Error('Failed to track analytics event');
    }
  }

  /**
   * Track onboarding step completion
   * @param {string} userId - User ID
   * @param {string} step - Step name
   * @param {number} duration - Time spent on step (ms)
   * @param {Object} stepData - Step-specific data
   * @param {Object} metadata - Request metadata
   */
  async trackStepCompletion(userId, step, duration, stepData = {}, metadata = {}) {
    const eventData = {
      step,
      duration,
      stepData,
      completedAt: new Date().toISOString()
    };

    await this.trackEvent(userId, this.eventTypes.STEP_COMPLETED, eventData, metadata);

    // Update step-specific analytics
    await this.updateStepAnalytics(step, 'completed', duration);
  }

  /**
   * Track onboarding step failure
   * @param {string} userId - User ID
   * @param {string} step - Step name
   * @param {string} error - Error message
   * @param {number} duration - Time spent before failure (ms)
   * @param {Object} metadata - Request metadata
   */
  async trackStepFailure(userId, step, error, duration, metadata = {}) {
    const eventData = {
      step,
      error,
      duration,
      failedAt: new Date().toISOString()
    };

    await this.trackEvent(userId, this.eventTypes.STEP_FAILED, eventData, metadata);

    // Update step-specific analytics
    await this.updateStepAnalytics(step, 'failed', duration);
  }

  /**
   * Track user drop-off (abandonment)
   * @param {string} userId - User ID
   * @param {string} step - Step where user dropped off
   * @param {number} timeSpent - Total time spent in onboarding (ms)
   * @param {Object} metadata - Request metadata
   */
  async trackDropOff(userId, step, timeSpent, metadata = {}) {
    const eventData = {
      dropOffStep: step,
      timeSpent,
      abandonedAt: new Date().toISOString()
    };

    await this.trackEvent(userId, this.eventTypes.STEP_ABANDONED, eventData, metadata);

    // Update drop-off analytics
    await this.updateDropOffAnalytics(step);
  }

  /**
   * Get onboarding funnel analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Object} Funnel analytics
   */
  async getOnboardingFunnel(filters = {}) {
    try {
      const { startDate, endDate } = this.getDateRange(filters);

      // Get step completion counts
      const stepQuery = `
        SELECT 
          event_data->>'step' as step,
          COUNT(*) as completions,
          AVG((event_data->>'duration')::numeric) as avg_duration,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (event_data->>'duration')::numeric) as median_duration
        FROM analytics_events 
        WHERE event_type = $1 
          AND created_at >= $2 
          AND created_at <= $3
          AND event_data->>'step' IS NOT NULL
        GROUP BY event_data->>'step'
        ORDER BY 
          CASE event_data->>'step'
            WHEN 'welcome' THEN 1
            WHEN 'google-connection' THEN 2
            WHEN 'business-categories' THEN 3
            WHEN 'label-mapping' THEN 4
            WHEN 'team-setup' THEN 5
            WHEN 'review' THEN 6
            WHEN 'workflow-deployment' THEN 7
            ELSE 8
          END
      `;

      const stepResult = await pool.query(stepQuery, [this.eventTypes.STEP_COMPLETED, startDate, endDate]);

      // Get drop-off counts
      const dropOffQuery = `
        SELECT 
          event_data->>'dropOffStep' as step,
          COUNT(*) as dropoffs
        FROM analytics_events 
        WHERE event_type = $1 
          AND created_at >= $2 
          AND created_at <= $3
        GROUP BY event_data->>'dropOffStep'
      `;

      const dropOffResult = await pool.query(dropOffQuery, [this.eventTypes.STEP_ABANDONED, startDate, endDate]);

      // Get total started count
      const startedQuery = `
        SELECT COUNT(*) as started
        FROM analytics_events 
        WHERE event_type = $1 
          AND created_at >= $2 
          AND created_at <= $3
      `;

      const startedResult = await pool.query(startedQuery, [this.eventTypes.ONBOARDING_STARTED, startDate, endDate]);

      const totalStarted = parseInt(startedResult.rows[0]?.started || 0);

      // Build funnel data
      const funnel = this.buildFunnelData(stepResult.rows, dropOffResult.rows, totalStarted);

      return {
        success: true,
        funnel,
        totalStarted,
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      console.error('Error getting onboarding funnel:', error);
      throw new Error('Failed to get onboarding funnel analytics');
    }
  }

  /**
   * Get conversion rate analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Object} Conversion analytics
   */
  async getConversionAnalytics(filters = {}) {
    try {
      const { startDate, endDate } = this.getDateRange(filters);

      const query = `
        WITH onboarding_stats AS (
          SELECT 
            COUNT(CASE WHEN event_type = $1 THEN 1 END) as started,
            COUNT(CASE WHEN event_type = $2 THEN 1 END) as completed,
            COUNT(CASE WHEN event_type = $3 THEN 1 END) as converted
          FROM analytics_events 
          WHERE created_at >= $4 AND created_at <= $5
        ),
        step_completion_rates AS (
          SELECT 
            event_data->>'step' as step,
            COUNT(*) as completions
          FROM analytics_events 
          WHERE event_type = $6
            AND created_at >= $4 
            AND created_at <= $5
          GROUP BY event_data->>'step'
        )
        SELECT 
          os.*,
          CASE WHEN os.started > 0 THEN (os.completed::float / os.started * 100) ELSE 0 END as completion_rate,
          CASE WHEN os.completed > 0 THEN (os.converted::float / os.completed * 100) ELSE 0 END as conversion_rate,
          CASE WHEN os.started > 0 THEN (os.converted::float / os.started * 100) ELSE 0 END as overall_conversion_rate
        FROM onboarding_stats os
      `;

      const result = await pool.query(query, [
        this.eventTypes.ONBOARDING_STARTED,
        this.eventTypes.ONBOARDING_COMPLETED,
        this.eventTypes.USER_CONVERTED,
        startDate,
        endDate,
        this.eventTypes.STEP_COMPLETED
      ]);

      const stats = result.rows[0];

      return {
        success: true,
        conversion: {
          started: parseInt(stats.started),
          completed: parseInt(stats.completed),
          converted: parseInt(stats.converted),
          completionRate: parseFloat(stats.completion_rate).toFixed(2),
          conversionRate: parseFloat(stats.conversion_rate).toFixed(2),
          overallConversionRate: parseFloat(stats.overall_conversion_rate).toFixed(2)
        },
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      console.error('Error getting conversion analytics:', error);
      throw new Error('Failed to get conversion analytics');
    }
  }

  /**
   * Get user behavior analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Object} Behavior analytics
   */
  async getUserBehaviorAnalytics(filters = {}) {
    try {
      const { startDate, endDate } = this.getDateRange(filters);

      // Average time to complete onboarding
      const timeToCompleteQuery = `
        WITH user_onboarding_times AS (
          SELECT 
            user_id,
            MIN(created_at) as started_at,
            MAX(CASE WHEN event_type = $1 THEN created_at END) as completed_at
          FROM analytics_events 
          WHERE created_at >= $2 AND created_at <= $3
            AND event_type IN ($4, $1)
          GROUP BY user_id
          HAVING MAX(CASE WHEN event_type = $1 THEN created_at END) IS NOT NULL
        )
        SELECT 
          COUNT(*) as completed_users,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_completion_time_seconds,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at))) as median_completion_time_seconds
        FROM user_onboarding_times
      `;

      const timeResult = await pool.query(timeToCompleteQuery, [
        this.eventTypes.ONBOARDING_COMPLETED,
        startDate,
        endDate,
        this.eventTypes.ONBOARDING_STARTED
      ]);

      // Most common failure points
      const failureQuery = `
        SELECT 
          event_data->>'step' as step,
          COUNT(*) as failure_count,
          COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as failure_percentage
        FROM analytics_events 
        WHERE event_type = $1 
          AND created_at >= $2 
          AND created_at <= $3
        GROUP BY event_data->>'step'
        ORDER BY failure_count DESC
        LIMIT 5
      `;

      const failureResult = await pool.query(failureQuery, [this.eventTypes.STEP_FAILED, startDate, endDate]);

      // Device and browser analytics
      const deviceQuery = `
        SELECT 
          metadata->>'userAgent' as user_agent,
          COUNT(*) as count
        FROM analytics_events 
        WHERE event_type = $1 
          AND created_at >= $2 
          AND created_at <= $3
          AND metadata->>'userAgent' IS NOT NULL
        GROUP BY metadata->>'userAgent'
        ORDER BY count DESC
        LIMIT 10
      `;

      const deviceResult = await pool.query(deviceQuery, [this.eventTypes.ONBOARDING_STARTED, startDate, endDate]);

      const timeStats = timeResult.rows[0];

      return {
        success: true,
        behavior: {
          averageCompletionTime: {
            seconds: parseFloat(timeStats.avg_completion_time_seconds || 0),
            minutes: parseFloat(timeStats.avg_completion_time_seconds || 0) / 60,
            formatted: this.formatDuration(timeStats.avg_completion_time_seconds * 1000)
          },
          medianCompletionTime: {
            seconds: parseFloat(timeStats.median_completion_time_seconds || 0),
            minutes: parseFloat(timeStats.median_completion_time_seconds || 0) / 60,
            formatted: this.formatDuration(timeStats.median_completion_time_seconds * 1000)
          },
          completedUsers: parseInt(timeStats.completed_users || 0),
          commonFailurePoints: failureResult.rows.map(row => ({
            step: row.step,
            count: parseInt(row.failure_count),
            percentage: parseFloat(row.failure_percentage).toFixed(2)
          })),
          topUserAgents: deviceResult.rows.map(row => ({
            userAgent: this.parseUserAgent(row.user_agent),
            count: parseInt(row.count)
          }))
        },
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      console.error('Error getting user behavior analytics:', error);
      throw new Error('Failed to get user behavior analytics');
    }
  }

  /**
   * Get real-time onboarding metrics
   * @returns {Object} Real-time metrics
   */
  async getRealTimeMetrics() {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);

      const query = `
        SELECT 
          COUNT(CASE WHEN event_type = $1 AND created_at >= $2 THEN 1 END) as started_24h,
          COUNT(CASE WHEN event_type = $1 AND created_at >= $3 THEN 1 END) as started_1h,
          COUNT(CASE WHEN event_type = $4 AND created_at >= $2 THEN 1 END) as completed_24h,
          COUNT(CASE WHEN event_type = $4 AND created_at >= $3 THEN 1 END) as completed_1h,
          COUNT(CASE WHEN event_type = $5 AND created_at >= $2 THEN 1 END) as failed_24h,
          COUNT(CASE WHEN event_type = $5 AND created_at >= $3 THEN 1 END) as failed_1h
        FROM analytics_events 
        WHERE created_at >= $2
      `;

      const result = await pool.query(query, [
        this.eventTypes.ONBOARDING_STARTED,
        last24Hours,
        lastHour,
        this.eventTypes.ONBOARDING_COMPLETED,
        this.eventTypes.STEP_FAILED
      ]);

      const metrics = result.rows[0];

      return {
        success: true,
        realTime: {
          last24Hours: {
            started: parseInt(metrics.started_24h),
            completed: parseInt(metrics.completed_24h),
            failed: parseInt(metrics.failed_24h),
            completionRate:
              metrics.started_24h > 0 ? ((metrics.completed_24h / metrics.started_24h) * 100).toFixed(2) : 0
          },
          lastHour: {
            started: parseInt(metrics.started_1h),
            completed: parseInt(metrics.completed_1h),
            failed: parseInt(metrics.failed_1h),
            completionRate: metrics.started_1h > 0 ? ((metrics.completed_1h / metrics.started_1h) * 100).toFixed(2) : 0
          }
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw new Error('Failed to get real-time metrics');
    }
  }

  // Helper methods
  getDateRange(filters) {
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    return { startDate, endDate };
  }

  buildFunnelData(stepData, dropOffData, totalStarted) {
    const steps = [
      'welcome',
      'google-connection',
      'business-categories',
      'label-mapping',
      'team-setup',
      'review',
      'workflow-deployment'
    ];
    const funnel = [];
    let previousCount = totalStarted;

    steps.forEach((step, index) => {
      const stepStats = stepData.find(s => s.step === step);
      const dropOffs = dropOffData.find(d => d.step === step);

      const completions = parseInt(stepStats?.completions || 0);
      const dropOffCount = parseInt(dropOffs?.dropoffs || 0);

      funnel.push({
        step,
        stepNumber: index + 1,
        completions,
        dropOffs: dropOffCount,
        conversionRate: previousCount > 0 ? ((completions / previousCount) * 100).toFixed(2) : 0,
        averageDuration: stepStats ? this.formatDuration(stepStats.avg_duration) : null,
        medianDuration: stepStats ? this.formatDuration(stepStats.median_duration) : null
      });

      previousCount = completions;
    });

    return funnel;
  }

  formatDuration(milliseconds) {
    if (!milliseconds) {
      return '0s';
    }

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  parseUserAgent(userAgent) {
    if (!userAgent) {
      return 'Unknown';
    }

    // Simple user agent parsing
    if (userAgent.includes('Chrome')) {
      return 'Chrome';
    }
    if (userAgent.includes('Firefox')) {
      return 'Firefox';
    }
    if (userAgent.includes('Safari')) {
      return 'Safari';
    }
    if (userAgent.includes('Edge')) {
      return 'Edge';
    }

    return 'Other';
  }

  async updateUserAnalytics(_userId, _eventType, _eventData) {
    // Update user-specific analytics summary
    // This could be implemented for user-level analytics
  }

  async updateStepAnalytics(_step, _status, _duration) {
    // Update step-specific analytics
    // This could be implemented for step-level analytics
  }

  async updateDropOffAnalytics(_step) {
    // Update drop-off analytics
    // This could be implemented for drop-off tracking
  }
}

module.exports = new AnalyticsService();
