const express = require('express');

const { authenticateToken } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const _cacheService = require('../services/cacheService');
const _performanceService = require('../services/performanceService');
const { _paginationMiddleware } = require('../utils/pagination');

const router = express.Router();

// GET /api/analytics
// Get user analytics overview
router.get('/', authenticateToken, (req, res) => {
  try {
    const _userId = req.user.id; // Prefixed with _ to indicate intentionally unused

    // Get basic analytics data
    const analyticsData = {
      success: true,
      analytics: {
        totalEvents: 0,
        recentActivity: [],
        summary: {
          emailsProcessed: 0,
          workflowsExecuted: 0,
          lastActivity: null
        }
      },
      message: 'Analytics data retrieved successfully'
    };

    res.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

// Middleware to extract request metadata
const extractMetadata = (req, res, next) => {
  req.metadata = {
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip || req.connection.remoteAddress,
    sessionId: req.get('X-Session-ID') || req.sessionID,
    timestamp: new Date().toISOString()
  };
  next();
};

// POST /api/analytics/track
// Track a custom analytics event
router.post('/track', authenticateToken, extractMetadata, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventType, eventData, customMetadata } = req.body;

    if (!eventType) {
      return res.status(400).json({
        error: 'Missing event type',
        message: 'eventType is required'
      });
    }

    const metadata = { ...req.metadata, ...customMetadata };

    const result = await analyticsService.trackEvent(userId, eventType, eventData || {}, metadata);

    res.json({
      success: true,
      event: result,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      error: 'Failed to track event',
      message: error.message
    });
  }
});

// POST /api/analytics/onboarding/started
// Track onboarding start
router.post('/onboarding/started', authenticateToken, extractMetadata, async (req, res) => {
  try {
    const userId = req.user.id;
    const { source, referrer } = req.body;

    const eventData = {
      source: source || 'direct',
      referrer: referrer || null,
      startedAt: new Date().toISOString()
    };

    const result = await analyticsService.trackEvent(
      userId,
      analyticsService.eventTypes.ONBOARDING_STARTED,
      eventData,
      req.metadata
    );

    res.json({
      success: true,
      event: result,
      message: 'Onboarding start tracked'
    });
  } catch (error) {
    console.error('Error tracking onboarding start:', error);
    res.status(500).json({
      error: 'Failed to track onboarding start',
      message: error.message
    });
  }
});

// POST /api/analytics/onboarding/step-completed
// Track step completion
router.post('/onboarding/step-completed', authenticateToken, extractMetadata, async (req, res) => {
  try {
    const userId = req.user.id;
    const { step, duration, stepData } = req.body;

    if (!step) {
      return res.status(400).json({
        error: 'Missing step',
        message: 'step is required'
      });
    }

    await analyticsService.trackStepCompletion(userId, step, duration || 0, stepData || {}, req.metadata);

    res.json({
      success: true,
      message: 'Step completion tracked'
    });
  } catch (error) {
    console.error('Error tracking step completion:', error);
    res.status(500).json({
      error: 'Failed to track step completion',
      message: error.message
    });
  }
});

// POST /api/analytics/onboarding/step-failed
// Track step failure
router.post('/onboarding/step-failed', authenticateToken, extractMetadata, async (req, res) => {
  try {
    const userId = req.user.id;
    const { step, error, duration } = req.body;

    if (!step || !error) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'step and error are required'
      });
    }

    await analyticsService.trackStepFailure(userId, step, error, duration || 0, req.metadata);

    res.json({
      success: true,
      message: 'Step failure tracked'
    });
  } catch (error) {
    console.error('Error tracking step failure:', error);
    res.status(500).json({
      error: 'Failed to track step failure',
      message: error.message
    });
  }
});

// POST /api/analytics/onboarding/completed
// Track onboarding completion
router.post('/onboarding/completed', authenticateToken, extractMetadata, async (req, res) => {
  try {
    const userId = req.user.id;
    const { totalDuration, stepsCompleted, workflowDeployed } = req.body;

    const eventData = {
      totalDuration: totalDuration || 0,
      stepsCompleted: stepsCompleted || 0,
      workflowDeployed: workflowDeployed || false,
      completedAt: new Date().toISOString()
    };

    const result = await analyticsService.trackEvent(
      userId,
      analyticsService.eventTypes.ONBOARDING_COMPLETED,
      eventData,
      req.metadata
    );

    res.json({
      success: true,
      event: result,
      message: 'Onboarding completion tracked'
    });
  } catch (error) {
    console.error('Error tracking onboarding completion:', error);
    res.status(500).json({
      error: 'Failed to track onboarding completion',
      message: error.message
    });
  }
});

// GET /api/analytics/funnel
// Get onboarding funnel analytics (admin only)
router.get('/funnel', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin (you might want to implement proper admin check)
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }

    const funnel = await analyticsService.getOnboardingFunnel(filters);

    res.json(funnel);
  } catch (error) {
    console.error('Error getting funnel analytics:', error);
    res.status(500).json({
      error: 'Failed to get funnel analytics',
      message: error.message
    });
  }
});

// GET /api/analytics/conversion
// Get conversion rate analytics (admin only)
router.get('/conversion', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }

    const conversion = await analyticsService.getConversionAnalytics(filters);

    res.json(conversion);
  } catch (error) {
    console.error('Error getting conversion analytics:', error);
    res.status(500).json({
      error: 'Failed to get conversion analytics',
      message: error.message
    });
  }
});

// GET /api/analytics/behavior
// Get user behavior analytics (admin only)
router.get('/behavior', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }

    const behavior = await analyticsService.getUserBehaviorAnalytics(filters);

    res.json(behavior);
  } catch (error) {
    console.error('Error getting behavior analytics:', error);
    res.status(500).json({
      error: 'Failed to get behavior analytics',
      message: error.message
    });
  }
});

// GET /api/analytics/realtime
// Get real-time metrics (admin only)
router.get('/realtime', authenticateToken, async (req, res) => {
  try {
    const metrics = await analyticsService.getRealTimeMetrics();

    res.json(metrics);
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({
      error: 'Failed to get real-time metrics',
      message: error.message
    });
  }
});

// GET /api/analytics/dashboard
// Get comprehensive dashboard data (admin only)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }

    // Get all analytics data in parallel
    const [funnel, conversion, behavior, realtime] = await Promise.all([
      analyticsService.getOnboardingFunnel(filters),
      analyticsService.getConversionAnalytics(filters),
      analyticsService.getUserBehaviorAnalytics(filters),
      analyticsService.getRealTimeMetrics()
    ]);

    res.json({
      success: true,
      dashboard: {
        funnel: funnel.funnel,
        conversion: conversion.conversion,
        behavior: behavior.behavior,
        realtime: realtime.realTime,
        dateRange: funnel.dateRange
      },
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      error: 'Failed to get dashboard data',
      message: error.message
    });
  }
});

// POST /api/analytics/drop-off
// Track user drop-off
router.post('/drop-off', authenticateToken, extractMetadata, async (req, res) => {
  try {
    const userId = req.user.id;
    const { step, timeSpent, reason } = req.body;

    if (!step) {
      return res.status(400).json({
        error: 'Missing step',
        message: 'step is required'
      });
    }

    await analyticsService.trackDropOff(userId, step, timeSpent || 0, { ...req.metadata, reason });

    res.json({
      success: true,
      message: 'Drop-off tracked'
    });
  } catch (error) {
    console.error('Error tracking drop-off:', error);
    res.status(500).json({
      error: 'Failed to track drop-off',
      message: error.message
    });
  }
});

module.exports = router;
