const { query } = require('../database/unified-connection');
const transactionService = require('./transactionService');
const crypto = require('crypto');

class OnboardingSessionService {
  constructor() {
    this.activeSessions = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Create or resume an onboarding session
   * @param {string} userId - User ID
   * @param {string} currentStep - Current onboarding step
   * @returns {Object} Session information
   */
  async createOrResumeSession(userId, currentStep = 'welcome') {
    try {
      // Check for existing session
      const existingSession = await this.getExistingSession(userId);

      if (existingSession && !this.isSessionExpired(existingSession)) {
        // Resume existing session
        existingSession.lastActivity = new Date();
        this.activeSessions.set(userId, existingSession);

        return {
          sessionId: existingSession.sessionId,
          resumed: true,
          currentStep: existingSession.currentStep,
          progress: existingSession.progress,
          lastActivity: existingSession.lastActivity
        };
      }

      // Create new session
      const sessionId = this.generateSessionId();
      const session = {
        sessionId,
        userId,
        currentStep,
        progress: {},
        startTime: new Date(),
        lastActivity: new Date(),
        status: 'active',
        checkpoints: [],
        errors: []
      };

      // Store in memory and database
      this.activeSessions.set(userId, session);
      await this.persistSession(session);

      return {
        sessionId,
        resumed: false,
        currentStep,
        progress: {},
        lastActivity: session.lastActivity
      };
    } catch (error) {
      console.error('Error creating/resuming onboarding session:', error);
      throw new Error('Failed to initialize onboarding session');
    }
  }

  /**
   * Save progress checkpoint
   * @param {string} userId - User ID
   * @param {string} step - Completed step
   * @param {Object} data - Step data
   * @param {string} transactionId - Optional transaction ID
   */
  async saveCheckpoint(userId, step, data, transactionId = null) {
    const session = this.activeSessions.get(userId);
    if (!session) {
      throw new Error('No active onboarding session found');
    }

    const checkpoint = {
      step,
      data,
      timestamp: new Date(),
      transactionId,
      status: 'completed'
    };

    try {
      // Add checkpoint to session
      session.checkpoints.push(checkpoint);
      session.progress[step] = data;
      session.currentStep = this.getNextStep(step);
      session.lastActivity = new Date();

      // Persist to database
      await this.persistCheckpoint(userId, checkpoint);
      await this.updateSessionProgress(userId, session);

      return {
        success: true,
        checkpoint,
        nextStep: session.currentStep,
        totalCheckpoints: session.checkpoints.length
      };
    } catch (error) {
      console.error('Error saving checkpoint:', error);

      // Mark checkpoint as failed
      checkpoint.status = 'failed';
      checkpoint.error = error.message;
      session.errors.push({
        step,
        error: error.message,
        timestamp: new Date(),
        transactionId
      });

      throw error;
    }
  }

  /**
   * Handle step failure and initiate recovery
   * @param {string} userId - User ID
   * @param {string} step - Failed step
   * @param {Error} error - Error that occurred
   * @param {string} transactionId - Transaction ID if applicable
   */
  async handleStepFailure(userId, step, error, transactionId = null) {
    const session = this.activeSessions.get(userId);
    if (!session) {
      throw new Error('No active onboarding session found');
    }

    const failureRecord = {
      step,
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
      transactionId,
      recoveryAttempts: 0
    };

    session.errors.push(failureRecord);
    session.lastActivity = new Date();

    try {
      // Rollback transaction if provided
      if (transactionId) {
        await transactionService.rollbackTransaction(transactionId);
        failureRecord.transactionRolledBack = true;
      }

      // Determine recovery strategy
      const recoveryStrategy = this.determineRecoveryStrategy(step, error);
      failureRecord.recoveryStrategy = recoveryStrategy;

      // Persist failure record
      await this.persistFailure(userId, failureRecord);

      return {
        success: true,
        failureId: failureRecord.timestamp.getTime(),
        recoveryStrategy,
        canRetry: recoveryStrategy.canRetry,
        suggestedAction: recoveryStrategy.suggestedAction
      };
    } catch (recoveryError) {
      console.error('Error handling step failure:', recoveryError);
      throw new Error('Failed to handle step failure');
    }
  }

  /**
   * Retry a failed step
   * @param {string} userId - User ID
   * @param {string} step - Step to retry
   * @param {number} failureId - Failure ID
   */
  async retryFailedStep(userId, step, failureId) {
    const session = this.activeSessions.get(userId);
    if (!session) {
      throw new Error('No active onboarding session found');
    }

    const failure = session.errors.find(e => e.timestamp.getTime() === failureId);
    if (!failure) {
      throw new Error('Failure record not found');
    }

    if (failure.recoveryAttempts >= 3) {
      throw new Error('Maximum retry attempts exceeded');
    }

    failure.recoveryAttempts++;
    failure.lastRetryAttempt = new Date();

    // Reset session to the failed step
    session.currentStep = step;
    session.lastActivity = new Date();

    await this.updateSessionProgress(userId, session);

    return {
      success: true,
      step,
      retryAttempt: failure.recoveryAttempts,
      maxRetries: 3
    };
  }

  /**
   * Get session recovery information
   * @param {string} userId - User ID
   * @returns {Object} Recovery information
   */
  async getRecoveryInfo(userId) {
    const session = this.activeSessions.get(userId) || (await this.getExistingSession(userId));

    if (!session) {
      return { hasRecoveryData: false };
    }

    const lastCheckpoint = session.checkpoints[session.checkpoints.length - 1];
    const recentErrors = session.errors.filter(
      e => new Date() - e.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    return {
      hasRecoveryData: true,
      sessionId: session.sessionId,
      lastSuccessfulStep: lastCheckpoint?.step,
      currentStep: session.currentStep,
      completedSteps: session.checkpoints.map(c => c.step),
      recentErrors: recentErrors.map(e => ({
        step: e.step,
        error: e.error,
        timestamp: e.timestamp,
        canRetry: e.recoveryAttempts < 3,
        recoveryStrategy: e.recoveryStrategy
      })),
      sessionAge: new Date() - session.startTime,
      isExpired: this.isSessionExpired(session)
    };
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const expiredSessions = [];

    for (const [userId, session] of this.activeSessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(userId);
      }
    }

    for (const userId of expiredSessions) {
      try {
        await this.archiveSession(userId);
        this.activeSessions.delete(userId);
      } catch (error) {
        console.error(`Failed to cleanup session for user ${userId}:`, error);
      }
    }

    return expiredSessions.length;
  }

  // Helper methods
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  isSessionExpired(session) {
    return new Date() - session.lastActivity > this.sessionTimeout;
  }

  getNextStep(currentStep) {
    const stepOrder = [
      'welcome',
      'google-connection',
      'business-type',
      'business-categories',
      'label-mapping',
      'team-setup',
      'review',
      'workflow-deployment',
      'completion'
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    return currentIndex < stepOrder.length - 1 ? stepOrder[currentIndex + 1] : 'completion';
  }

  determineRecoveryStrategy(step, _error) {
    const strategies = {
      'google-connection': {
        canRetry: true,
        suggestedAction: 'retry_oauth',
        message: 'Please try connecting your Google account again',
        autoRetry: false
      },
      'business-categories': {
        canRetry: true,
        suggestedAction: 'retry_step',
        message: 'Please try saving your categories again',
        autoRetry: true
      },
      'label-mapping': {
        canRetry: true,
        suggestedAction: 'refresh_labels',
        message: "We'll refresh your Gmail labels and try again",
        autoRetry: true
      },
      'team-setup': {
        canRetry: true,
        suggestedAction: 'retry_step',
        message: 'Please try saving your team setup again',
        autoRetry: true
      },
      'workflow-deployment': {
        canRetry: true,
        suggestedAction: 'retry_deployment',
        message: "We'll attempt to deploy your workflow again",
        autoRetry: false
      }
    };

    return (
      strategies[step] || {
        canRetry: true,
        suggestedAction: 'retry_step',
        message: 'Please try this step again',
        autoRetry: false
      }
    );
  }

  async getExistingSession(userId) {
    const query = `
      SELECT session_id, current_step, progress, start_time, last_activity, status
      FROM onboarding_sessions 
      WHERE user_id = $1 AND status = 'active'
      ORDER BY last_activity DESC 
      LIMIT 1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      sessionId: row.session_id,
      userId,
      currentStep: row.current_step,
      progress: row.progress || {},
      startTime: row.start_time,
      lastActivity: row.last_activity,
      status: row.status,
      checkpoints: [],
      errors: []
    };
  }

  async persistSession(session) {
    const query = `
      INSERT INTO onboarding_sessions (
        session_id, user_id, current_step, progress, start_time, last_activity, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        session_id = EXCLUDED.session_id,
        current_step = EXCLUDED.current_step,
        progress = EXCLUDED.progress,
        last_activity = EXCLUDED.last_activity,
        status = EXCLUDED.status
    `;

    await pool.query(query, [
      session.sessionId,
      session.userId,
      session.currentStep,
      JSON.stringify(session.progress),
      session.startTime,
      session.lastActivity,
      session.status
    ]);
  }

  async persistCheckpoint(userId, checkpoint) {
    const query = `
      INSERT INTO onboarding_checkpoints (
        user_id, step, data, timestamp, transaction_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await pool.query(query, [
      userId,
      checkpoint.step,
      JSON.stringify(checkpoint.data),
      checkpoint.timestamp,
      checkpoint.transactionId,
      checkpoint.status
    ]);
  }

  async persistFailure(userId, failure) {
    const query = `
      INSERT INTO onboarding_failures (
        user_id, step, error_message, error_stack, timestamp, transaction_id, recovery_attempts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await pool.query(query, [
      userId,
      failure.step,
      failure.error,
      failure.stack,
      failure.timestamp,
      failure.transactionId,
      failure.recoveryAttempts
    ]);
  }

  async updateSessionProgress(userId, session) {
    const query = `
      UPDATE onboarding_sessions 
      SET current_step = $1, progress = $2, last_activity = $3
      WHERE user_id = $4
    `;

    await pool.query(query, [session.currentStep, JSON.stringify(session.progress), session.lastActivity, userId]);
  }

  async archiveSession(userId) {
    const query = `
      UPDATE onboarding_sessions 
      SET status = 'archived', archived_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `;

    await pool.query(query, [userId]);
  }
}

// Singleton instance
const onboardingSessionService = new OnboardingSessionService();

// Cleanup expired sessions every 10 minutes
setInterval(
  () => {
    onboardingSessionService.cleanupExpiredSessions().catch(console.error);
  },
  10 * 60 * 1000
);

module.exports = onboardingSessionService;
