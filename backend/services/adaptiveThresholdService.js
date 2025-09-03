/**
 * Adaptive Threshold Monitoring Service
 * Machine learning-based threshold tuning that adapts to actual usage patterns
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

class AdaptiveThresholdService extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    
    // Historical data storage
    this.historicalData = new Map();
    this.thresholdHistory = new Map();
    this.adaptationRules = new Map();
    
    // Learning parameters
    this.learningConfig = {
      minDataPoints: 100,        // Minimum data points before adaptation
      adaptationInterval: 3600000, // 1 hour in milliseconds
      confidenceThreshold: 0.8,   // Confidence level for threshold changes
      maxAdjustmentPercent: 0.2,  // Maximum 20% adjustment per iteration
      seasonalityWindow: 7 * 24,  // 7 days of hourly data for seasonality
      anomalyDetectionWindow: 24  // 24 hours for anomaly detection
    };

    // Metric configurations for adaptive thresholds
    this.metricConfigs = {
      response_time: {
        type: 'performance',
        unit: 'milliseconds',
        direction: 'upper', // Alert when value goes above threshold
        baselinePercentile: 95, // Use 95th percentile as baseline
        seasonalityFactor: true,
        businessHoursFactor: true,
        adaptationSensitivity: 0.1
      },
      error_rate: {
        type: 'reliability',
        unit: 'percentage',
        direction: 'upper',
        baselinePercentile: 90,
        seasonalityFactor: false,
        businessHoursFactor: true,
        adaptationSensitivity: 0.05
      },
      connection_count: {
        type: 'capacity',
        unit: 'count',
        direction: 'upper',
        baselinePercentile: 85,
        seasonalityFactor: true,
        businessHoursFactor: true,
        adaptationSensitivity: 0.15
      },
      onboarding_success_rate: {
        type: 'business',
        unit: 'percentage',
        direction: 'lower', // Alert when value goes below threshold
        baselinePercentile: 10, // Use 10th percentile as baseline for lower bounds
        seasonalityFactor: false,
        businessHoursFactor: true,
        adaptationSensitivity: 0.08
      },
      workflow_execution_time: {
        type: 'business',
        unit: 'seconds',
        direction: 'upper',
        baselinePercentile: 90,
        seasonalityFactor: true,
        businessHoursFactor: false,
        adaptationSensitivity: 0.12
      }
    };

    // Current adaptive thresholds
    this.adaptiveThresholds = new Map();
    
    // Statistical models for each metric
    this.statisticalModels = new Map();
  }

  /**
   * Initialize adaptive threshold service
   */
  async initialize() {
    if (this.isInitialized) {return;}

    try {
      // Load historical data
      await this.loadHistoricalData();

      // Initialize statistical models
      this.initializeStatisticalModels();

      // Set up adaptation intervals
      this.setupAdaptationIntervals();

      // Initialize baseline thresholds
      await this.initializeBaselineThresholds();

      this.isInitialized = true;
      logger.info('Adaptive threshold service initialized');
      this.emit('adaptive:initialized');

    } catch (error) {
      logger.error('Failed to initialize adaptive threshold service', { error: error.message });
      throw error;
    }
  }

  /**
   * Record metric data point for learning
   */
  recordMetricData(metricName, value, timestamp = Date.now(), context = {}) {
    if (!this.metricConfigs[metricName]) {
      logger.warn(`Unknown metric for adaptive thresholds: ${metricName}`);
      return;
    }

    // Get or create historical data array
    if (!this.historicalData.has(metricName)) {
      this.historicalData.set(metricName, []);
    }

    const dataPoint = {
      value,
      timestamp,
      context: {
        businessHours: this.isBusinessHours(timestamp),
        dayOfWeek: new Date(timestamp).getDay(),
        hourOfDay: new Date(timestamp).getHours(),
        ...context
      }
    };

    const historicalArray = this.historicalData.get(metricName);
    historicalArray.push(dataPoint);

    // Keep only recent data (configurable window)
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const cutoffTime = timestamp - maxAge;
    
    const filteredData = historicalArray.filter(point => point.timestamp > cutoffTime);
    this.historicalData.set(metricName, filteredData);

    // Trigger adaptation if enough data points
    if (filteredData.length >= this.learningConfig.minDataPoints) {
      this.scheduleAdaptation(metricName);
    }
  }

  /**
   * Initialize statistical models for each metric
   */
  initializeStatisticalModels() {
    for (const metricName of Object.keys(this.metricConfigs)) {
      this.statisticalModels.set(metricName, {
        mean: 0,
        standardDeviation: 0,
        percentiles: {},
        seasonalPatterns: {},
        businessHoursPattern: {},
        trendCoefficient: 0,
        lastUpdated: Date.now()
      });
    }
  }

  /**
   * Set up adaptation intervals
   */
  setupAdaptationIntervals() {
    setInterval(() => {
      this.performScheduledAdaptations();
    }, this.learningConfig.adaptationInterval);

    // Daily model updates
    setInterval(() => {
      this.updateStatisticalModels();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Initialize baseline thresholds
   */
  async initializeBaselineThresholds() {
    for (const [metricName, config] of Object.entries(this.metricConfigs)) {
      // Set conservative initial thresholds
      let initialThreshold;
      
      switch (config.type) {
        case 'performance':
          initialThreshold = metricName === 'response_time' ? 1000 : 500; // ms
          break;
        case 'reliability':
          initialThreshold = 0.05; // 5% error rate
          break;
        case 'capacity':
          initialThreshold = 20; // connections
          break;
        case 'business':
          initialThreshold = metricName.includes('rate') ? 0.8 : 300; // 80% or 5 minutes
          break;
        default:
          initialThreshold = 100;
      }

      this.adaptiveThresholds.set(metricName, {
        current: initialThreshold,
        baseline: initialThreshold,
        confidence: 0.5,
        lastAdapted: Date.now(),
        adaptationHistory: []
      });
    }

    logger.info('Baseline thresholds initialized', {
      metrics: Array.from(this.adaptiveThresholds.keys())
    });
  }

  /**
   * Perform scheduled adaptations
   */
  async performScheduledAdaptations() {
    for (const metricName of Object.keys(this.metricConfigs)) {
      try {
        await this.adaptThreshold(metricName);
      } catch (error) {
        logger.error(`Failed to adapt threshold for ${metricName}`, { error: error.message });
      }
    }
  }

  /**
   * Adapt threshold for a specific metric
   */
  async adaptThreshold(metricName) {
    const historicalData = this.historicalData.get(metricName);
    const config = this.metricConfigs[metricName];
    const currentThreshold = this.adaptiveThresholds.get(metricName);

    if (!historicalData || historicalData.length < this.learningConfig.minDataPoints) {
      return; // Not enough data for adaptation
    }

    // Calculate statistical properties
    const stats = this.calculateStatistics(historicalData, config);
    
    // Detect patterns and seasonality
    const patterns = this.detectPatterns(historicalData, config);
    
    // Calculate optimal threshold
    const optimalThreshold = this.calculateOptimalThreshold(stats, patterns, config);
    
    // Validate threshold change
    const validatedThreshold = this.validateThresholdChange(
      currentThreshold.current,
      optimalThreshold,
      config
    );

    // Calculate confidence in the new threshold
    const confidence = this.calculateConfidence(stats, patterns, historicalData.length);

    // Apply threshold if confidence is high enough
    if (confidence >= this.learningConfig.confidenceThreshold) {
      const oldThreshold = currentThreshold.current;
      
      currentThreshold.current = validatedThreshold;
      currentThreshold.confidence = confidence;
      currentThreshold.lastAdapted = Date.now();
      currentThreshold.adaptationHistory.push({
        timestamp: Date.now(),
        oldThreshold,
        newThreshold: validatedThreshold,
        confidence,
        reason: 'statistical_adaptation'
      });

      // Keep only recent adaptation history
      if (currentThreshold.adaptationHistory.length > 50) {
        currentThreshold.adaptationHistory = currentThreshold.adaptationHistory.slice(-50);
      }

      logger.info('Threshold adapted', {
        metric: metricName,
        oldThreshold,
        newThreshold: validatedThreshold,
        confidence,
        dataPoints: historicalData.length
      });

      this.emit('threshold:adapted', {
        metric: metricName,
        oldThreshold,
        newThreshold: validatedThreshold,
        confidence
      });
    }
  }

  /**
   * Calculate statistics for historical data
   */
  calculateStatistics(data, config) {
    const values = data.map(point => point.value);
    
    // Basic statistics
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Percentiles
    const sortedValues = [...values].sort((a, b) => a - b);
    const percentiles = {};
    [10, 25, 50, 75, 90, 95, 99].forEach(p => {
      const index = Math.ceil((p / 100) * sortedValues.length) - 1;
      percentiles[p] = sortedValues[Math.max(0, index)];
    });

    // Business hours vs non-business hours
    const businessHoursData = data.filter(point => point.context.businessHours);
    const nonBusinessHoursData = data.filter(point => !point.context.businessHours);
    
    const businessHoursStats = businessHoursData.length > 0 ? {
      mean: businessHoursData.reduce((sum, point) => sum + point.value, 0) / businessHoursData.length,
      count: businessHoursData.length
    } : null;

    const nonBusinessHoursStats = nonBusinessHoursData.length > 0 ? {
      mean: nonBusinessHoursData.reduce((sum, point) => sum + point.value, 0) / nonBusinessHoursData.length,
      count: nonBusinessHoursData.length
    } : null;

    return {
      mean,
      standardDeviation,
      percentiles,
      businessHoursStats,
      nonBusinessHoursStats,
      dataPoints: values.length
    };
  }

  /**
   * Detect patterns in historical data
   */
  detectPatterns(data, config) {
    const patterns = {
      seasonality: {},
      trend: 0,
      businessHoursEffect: 0,
      anomalies: []
    };

    // Detect hourly patterns
    const hourlyData = {};
    data.forEach(point => {
      const hour = point.context.hourOfDay;
      if (!hourlyData[hour]) {hourlyData[hour] = [];}
      hourlyData[hour].push(point.value);
    });

    // Calculate hourly averages
    Object.keys(hourlyData).forEach(hour => {
      const values = hourlyData[hour];
      patterns.seasonality[hour] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    // Detect trend (simple linear regression)
    if (data.length > 10) {
      const timeValues = data.map((point, index) => index);
      const dataValues = data.map(point => point.value);
      patterns.trend = this.calculateLinearTrend(timeValues, dataValues);
    }

    // Business hours effect
    if (config.businessHoursFactor) {
      const businessHoursAvg = data
        .filter(point => point.context.businessHours)
        .reduce((sum, point, _, arr) => sum + point.value / arr.length, 0);
      
      const nonBusinessHoursAvg = data
        .filter(point => !point.context.businessHours)
        .reduce((sum, point, _, arr) => sum + point.value / arr.length, 0);

      patterns.businessHoursEffect = businessHoursAvg - nonBusinessHoursAvg;
    }

    return patterns;
  }

  /**
   * Calculate optimal threshold based on statistics and patterns
   */
  calculateOptimalThreshold(stats, patterns, config) {
    let baseThreshold;

    // Use appropriate percentile based on direction
    if (config.direction === 'upper') {
      baseThreshold = stats.percentiles[config.baselinePercentile];
    } else {
      baseThreshold = stats.percentiles[config.baselinePercentile];
    }

    // Adjust for business hours if applicable
    if (config.businessHoursFactor && this.isBusinessHours()) {
      const businessHoursMultiplier = patterns.businessHoursEffect > 0 ? 1.1 : 0.9;
      baseThreshold *= businessHoursMultiplier;
    }

    // Adjust for seasonality
    if (config.seasonalityFactor) {
      const currentHour = new Date().getHours();
      const seasonalMultiplier = patterns.seasonality[currentHour] ? 
        patterns.seasonality[currentHour] / stats.mean : 1;
      baseThreshold *= Math.max(0.8, Math.min(1.2, seasonalMultiplier));
    }

    // Adjust for trend
    if (Math.abs(patterns.trend) > 0.1) {
      const trendAdjustment = patterns.trend > 0 ? 1.05 : 0.95;
      baseThreshold *= trendAdjustment;
    }

    return baseThreshold;
  }

  /**
   * Validate threshold change to prevent extreme adjustments
   */
  validateThresholdChange(currentThreshold, proposedThreshold, config) {
    const maxChange = currentThreshold * this.learningConfig.maxAdjustmentPercent;
    const change = proposedThreshold - currentThreshold;

    if (Math.abs(change) > maxChange) {
      // Limit the change to maximum allowed
      const limitedChange = change > 0 ? maxChange : -maxChange;
      return currentThreshold + limitedChange;
    }

    // Ensure threshold makes sense for the metric type
    const minThreshold = this.getMinThreshold(config);
    const maxThreshold = this.getMaxThreshold(config);

    return Math.max(minThreshold, Math.min(maxThreshold, proposedThreshold));
  }

  /**
   * Calculate confidence in threshold adaptation
   */
  calculateConfidence(stats, patterns, dataPointCount) {
    let confidence = 0.5; // Base confidence

    // More data points increase confidence
    const dataConfidence = Math.min(1.0, dataPointCount / (this.learningConfig.minDataPoints * 2));
    confidence += dataConfidence * 0.3;

    // Lower standard deviation increases confidence
    const stabilityConfidence = Math.max(0, 1 - (stats.standardDeviation / stats.mean));
    confidence += stabilityConfidence * 0.2;

    return Math.min(1.0, confidence);
  }

  /**
   * Calculate linear trend
   */
  calculateLinearTrend(xValues, yValues) {
    const n = xValues.length;
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Get minimum threshold for metric type
   */
  getMinThreshold(config) {
    switch (config.type) {
      case 'performance':
        return config.unit === 'milliseconds' ? 50 : 1;
      case 'reliability':
        return 0.001; // 0.1% minimum error rate
      case 'capacity':
        return 1;
      case 'business':
        return config.unit === 'percentage' ? 0.1 : 10;
      default:
        return 1;
    }
  }

  /**
   * Get maximum threshold for metric type
   */
  getMaxThreshold(config) {
    switch (config.type) {
      case 'performance':
        return config.unit === 'milliseconds' ? 30000 : 1000;
      case 'reliability':
        return 0.5; // 50% maximum error rate
      case 'capacity':
        return 1000;
      case 'business':
        return config.unit === 'percentage' ? 1.0 : 3600;
      default:
        return 1000;
    }
  }

  /**
   * Check if current time is business hours
   */
  isBusinessHours(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const day = date.getDay();
    
    // Monday to Friday, 9 AM to 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  }

  /**
   * Get current adaptive threshold for metric
   */
  getAdaptiveThreshold(metricName) {
    const threshold = this.adaptiveThresholds.get(metricName);
    return threshold ? threshold.current : null;
  }

  /**
   * Get all adaptive thresholds
   */
  getAllAdaptiveThresholds() {
    const thresholds = {};
    for (const [metricName, threshold] of this.adaptiveThresholds) {
      thresholds[metricName] = {
        current: threshold.current,
        confidence: threshold.confidence,
        lastAdapted: threshold.lastAdapted
      };
    }
    return thresholds;
  }

  /**
   * Get adaptation history for metric
   */
  getAdaptationHistory(metricName) {
    const threshold = this.adaptiveThresholds.get(metricName);
    return threshold ? threshold.adaptationHistory : [];
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      trackedMetrics: Array.from(this.historicalData.keys()),
      adaptiveThresholds: this.getAllAdaptiveThresholds(),
      dataPoints: Array.from(this.historicalData.entries()).reduce((total, [_, data]) => total + data.length, 0),
      lastAdaptation: Math.max(...Array.from(this.adaptiveThresholds.values()).map(t => t.lastAdapted))
    };
  }

  /**
   * Schedule adaptation for a metric
   */
  scheduleAdaptation(metricName) {
    // Debounce adaptation requests
    if (!this.adaptationSchedule) {
      this.adaptationSchedule = new Map();
    }

    if (this.adaptationSchedule.has(metricName)) {
      clearTimeout(this.adaptationSchedule.get(metricName));
    }

    const timer = setTimeout(() => {
      this.adaptThreshold(metricName);
      this.adaptationSchedule.delete(metricName);
    }, 60000); // 1 minute debounce

    this.adaptationSchedule.set(metricName, timer);
  }

  /**
   * Update statistical models
   */
  updateStatisticalModels() {
    for (const [metricName, data] of this.historicalData) {
      if (data.length >= this.learningConfig.minDataPoints) {
        const config = this.metricConfigs[metricName];
        const stats = this.calculateStatistics(data, config);
        const patterns = this.detectPatterns(data, config);

        this.statisticalModels.set(metricName, {
          ...stats,
          patterns,
          lastUpdated: Date.now()
        });
      }
    }
  }

  /**
   * Load historical data (placeholder for persistence)
   */
  async loadHistoricalData() {
    // In production, this would load from persistent storage
    logger.info('Historical data loading placeholder - implement persistence as needed');
  }

  /**
   * Shutdown adaptive threshold service
   */
  shutdown() {
    // Clear adaptation schedules
    if (this.adaptationSchedule) {
      for (const timer of this.adaptationSchedule.values()) {
        clearTimeout(timer);
      }
      this.adaptationSchedule.clear();
    }

    this.isInitialized = false;
    this.historicalData.clear();
    this.adaptiveThresholds.clear();

    logger.info('Adaptive threshold service shut down');
    this.emit('adaptive:shutdown');
  }
}

// Export singleton instance
const adaptiveThresholdService = new AdaptiveThresholdService();
module.exports = adaptiveThresholdService;
