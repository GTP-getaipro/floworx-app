/**
 * Production Deployment Orchestrator
 * Coordinates all monitoring services for production deployment
 */

const EventEmitter = require('events');
const productionMonitoringService = require('./productionMonitoringService');
const businessAlertingEngine = require('./businessAlertingEngine');
const stakeholderReportingService = require('./stakeholderReportingService');
const adaptiveThresholdService = require('./adaptiveThresholdService');
const realTimeMonitoringService = require('./realTimeMonitoringService');
const errorTrackingService = require('./errorTrackingService');
const logger = require('../utils/logger');

class ProductionDeploymentOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.deploymentStatus = {
      phase: 'not_started',
      services: {},
      startTime: null,
      completionTime: null,
      errors: []
    };

    this.deploymentPhases = [
      'initialization',
      'core_services',
      'monitoring_integration',
      'alerting_setup',
      'reporting_configuration',
      'adaptive_learning',
      'health_validation',
      'production_ready'
    ];

    this.currentPhaseIndex = 0;
    this.isDeploying = false;
  }

  /**
   * Deploy all monitoring services to production
   */
  async deployToProduction() {
    if (this.isDeploying) {
      throw new Error('Deployment already in progress');
    }

    this.isDeploying = true;
    this.deploymentStatus.phase = 'starting';
    this.deploymentStatus.startTime = Date.now();
    this.deploymentStatus.errors = [];

    logger.info('🚀 Starting FloWorx production monitoring deployment');
    this.emit('deployment:started');

    try {
      // Execute deployment phases sequentially
      for (let i = 0; i < this.deploymentPhases.length; i++) {
        this.currentPhaseIndex = i;
        const phase = this.deploymentPhases[i];
        
        logger.info(`📋 Executing deployment phase: ${phase}`);
        this.deploymentStatus.phase = phase;
        this.emit('deployment:phase:started', { phase, index: i });

        await this.executeDeploymentPhase(phase);

        logger.info(`✅ Completed deployment phase: ${phase}`);
        this.emit('deployment:phase:completed', { phase, index: i });
      }

      // Deployment successful
      this.deploymentStatus.phase = 'completed';
      this.deploymentStatus.completionTime = Date.now();
      this.isDeploying = false;

      const duration = this.deploymentStatus.completionTime - this.deploymentStatus.startTime;
      logger.info(`🎉 FloWorx production monitoring deployment completed successfully in ${duration}ms`);
      this.emit('deployment:completed', { duration, status: this.deploymentStatus });

      return this.deploymentStatus;

    } catch (error) {
      this.deploymentStatus.errors.push({
        phase: this.deploymentStatus.phase,
        error: error.message,
        timestamp: Date.now()
      });

      this.deploymentStatus.phase = 'failed';
      this.isDeploying = false;

      logger.error('❌ Production monitoring deployment failed', { 
        error: error.message,
        phase: this.deploymentStatus.phase
      });

      this.emit('deployment:failed', { error: error.message, status: this.deploymentStatus });
      throw error;
    }
  }

  /**
   * Execute specific deployment phase
   */
  async executeDeploymentPhase(phase) {
    switch (phase) {
      case 'initialization':
        await this.initializationPhase();
        break;
      case 'core_services':
        await this.coreServicesPhase();
        break;
      case 'monitoring_integration':
        await this.monitoringIntegrationPhase();
        break;
      case 'alerting_setup':
        await this.alertingSetupPhase();
        break;
      case 'reporting_configuration':
        await this.reportingConfigurationPhase();
        break;
      case 'adaptive_learning':
        await this.adaptiveLearningPhase();
        break;
      case 'health_validation':
        await this.healthValidationPhase();
        break;
      case 'production_ready':
        await this.productionReadyPhase();
        break;
      default:
        throw new Error(`Unknown deployment phase: ${phase}`);
    }
  }

  /**
   * Phase 1: Initialization
   */
  async initializationPhase() {
    logger.info('🔧 Initializing production environment');

    // Validate environment variables
    await this.validateEnvironmentConfiguration();

    // Check database connectivity
    await this.validateDatabaseConnectivity();

    // Verify external service availability
    await this.validateExternalServices();

    this.deploymentStatus.services.initialization = 'completed';
  }

  /**
   * Phase 2: Core Services
   */
  async coreServicesPhase() {
    logger.info('⚙️ Starting core monitoring services');

    // Initialize real-time monitoring
    await realTimeMonitoringService.startMonitoring();
    this.deploymentStatus.services.realTimeMonitoring = 'running';

    // Initialize error tracking
    await errorTrackingService.initialize();
    this.deploymentStatus.services.errorTracking = 'running';

    // Initialize production monitoring service
    await productionMonitoringService.initialize();
    this.deploymentStatus.services.productionMonitoring = 'running';

    logger.info('✅ Core services initialized successfully');
  }

  /**
   * Phase 3: Monitoring Integration
   */
  async monitoringIntegrationPhase() {
    logger.info('🔗 Setting up monitoring integrations');

    // Integrate monitoring services
    this.setupMonitoringIntegrations();

    // Configure data flow between services
    this.configureDataFlow();

    // Set up cross-service event handling
    this.setupCrossServiceEvents();

    this.deploymentStatus.services.monitoringIntegration = 'completed';
  }

  /**
   * Phase 4: Alerting Setup
   */
  async alertingSetupPhase() {
    logger.info('🚨 Configuring business alerting engine');

    // Initialize business alerting engine
    await businessAlertingEngine.initialize();
    this.deploymentStatus.services.businessAlerting = 'running';

    // Configure alert channels
    await this.configureAlertChannels();

    // Set up escalation procedures
    await this.configureEscalationProcedures();

    logger.info('✅ Alerting system configured successfully');
  }

  /**
   * Phase 5: Reporting Configuration
   */
  async reportingConfigurationPhase() {
    logger.info('📊 Setting up stakeholder reporting');

    // Initialize reporting service
    await stakeholderReportingService.initialize();
    this.deploymentStatus.services.stakeholderReporting = 'running';

    // Configure report schedules
    await this.configureReportSchedules();

    // Test report generation
    await this.testReportGeneration();

    logger.info('✅ Reporting system configured successfully');
  }

  /**
   * Phase 6: Adaptive Learning
   */
  async adaptiveLearningPhase() {
    logger.info('🧠 Initializing adaptive threshold learning');

    // Initialize adaptive threshold service
    await adaptiveThresholdService.initialize();
    this.deploymentStatus.services.adaptiveThresholds = 'running';

    // Configure learning parameters
    await this.configureAdaptiveLearning();

    // Start threshold adaptation
    await this.startThresholdAdaptation();

    logger.info('✅ Adaptive learning system initialized');
  }

  /**
   * Phase 7: Health Validation
   */
  async healthValidationPhase() {
    logger.info('🏥 Validating system health');

    // Perform comprehensive health checks
    const healthResults = await this.performHealthChecks();

    // Validate all services are running
    await this.validateServiceHealth();

    // Test alert generation
    await this.testAlertGeneration();

    // Validate data collection
    await this.validateDataCollection();

    if (!healthResults.allHealthy) {
      throw new Error('Health validation failed: ' + healthResults.issues.join(', '));
    }

    this.deploymentStatus.services.healthValidation = 'completed';
    logger.info('✅ Health validation passed');
  }

  /**
   * Phase 8: Production Ready
   */
  async productionReadyPhase() {
    logger.info('🎯 Finalizing production deployment');

    // Generate deployment summary
    const deploymentSummary = await this.generateDeploymentSummary();

    // Send deployment notification
    await this.sendDeploymentNotification(deploymentSummary);

    // Enable production monitoring
    await this.enableProductionMonitoring();

    // Schedule first reports
    await this.scheduleInitialReports();

    this.deploymentStatus.services.productionReady = 'completed';
    logger.info('🚀 Production deployment ready!');
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironmentConfiguration() {
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    logger.info('✅ Environment configuration validated');
  }

  /**
   * Validate database connectivity
   */
  async validateDatabaseConnectivity() {
    try {
      const { query } = require('../database/unified-connection');
      await query('SELECT 1 as health_check');
      logger.info('✅ Database connectivity validated');
    } catch (error) {
      throw new Error(`Database connectivity failed: ${error.message}`);
    }
  }

  /**
   * Validate external services
   */
  async validateExternalServices() {
    const services = [];

    // Check N8N if configured
    if (process.env.N8N_BASE_URL) {
      services.push(this.checkN8NConnectivity());
    }

    // Check email service if configured
    if (process.env.SMTP_HOST) {
      services.push(this.checkEmailService());
    }

    await Promise.all(services);
    logger.info('✅ External services validated');
  }

  /**
   * Setup monitoring integrations
   */
  setupMonitoringIntegrations() {
    // Connect real-time monitoring to error tracking
    realTimeMonitoringService.on('query:executed', (data) => {
      if (!data.success && data.error) {
        errorTrackingService.trackError(data.error, {
          type: 'database_query',
          query: data.queryText,
          duration: data.duration
        });
      }
    });

    // Connect error tracking to business alerting
    errorTrackingService.on('alert:created', (alert) => {
      businessAlertingEngine.evaluateBusinessRules({
        errors: { newAlert: alert }
      });
    });

    // Connect adaptive thresholds to monitoring
    adaptiveThresholdService.on('threshold:adapted', (data) => {
      realTimeMonitoringService.updateThresholds({
        [data.metric]: data.newThreshold
      });
    });

    logger.info('✅ Monitoring integrations configured');
  }

  /**
   * Configure data flow between services
   */
  configureDataFlow() {
    // Set up metric data recording for adaptive thresholds
    realTimeMonitoringService.on('metrics:updated', (metrics) => {
      // Record performance metrics
      adaptiveThresholdService.recordMetricData(
        'response_time',
        metrics.performance.averageResponseTime
      );
      
      adaptiveThresholdService.recordMetricData(
        'connection_count',
        metrics.performance.currentConnections
      );
    });

    logger.info('✅ Data flow configured');
  }

  /**
   * Perform comprehensive health checks
   */
  async performHealthChecks() {
    const healthResults = {
      allHealthy: true,
      services: {},
      issues: []
    };

    // Check each service
    const services = [
      { name: 'realTimeMonitoring', service: realTimeMonitoringService },
      { name: 'errorTracking', service: errorTrackingService },
      { name: 'businessAlerting', service: businessAlertingEngine },
      { name: 'stakeholderReporting', service: stakeholderReportingService },
      { name: 'adaptiveThresholds', service: adaptiveThresholdService }
    ];

    for (const { name, service } of services) {
      try {
        const status = service.getStatus ? service.getStatus() : { healthy: true };
        healthResults.services[name] = status;
        
        if (status.healthy === false || status.isInitialized === false) {
          healthResults.allHealthy = false;
          healthResults.issues.push(`${name} service not healthy`);
        }
      } catch (error) {
        healthResults.allHealthy = false;
        healthResults.issues.push(`${name} health check failed: ${error.message}`);
      }
    }

    return healthResults;
  }

  /**
   * Generate deployment summary
   */
  async generateDeploymentSummary() {
    const duration = Date.now() - this.deploymentStatus.startTime;
    
    return {
      deploymentTime: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(2)}s`,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      services: Object.keys(this.deploymentStatus.services),
      phases: this.deploymentPhases,
      errors: this.deploymentStatus.errors
    };
  }

  /**
   * Send deployment notification
   */
  async sendDeploymentNotification(summary) {
    logger.info('📧 Sending deployment notification', summary);
    
    // This would integrate with your notification system
    this.emit('deployment:notification', summary);
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus() {
    return {
      ...this.deploymentStatus,
      currentPhase: this.deploymentPhases[this.currentPhaseIndex],
      progress: ((this.currentPhaseIndex + 1) / this.deploymentPhases.length) * 100,
      isDeploying: this.isDeploying
    };
  }

  /**
   * Shutdown all services
   */
  async shutdown() {
    logger.info('🛑 Shutting down production monitoring services');

    const services = [
      adaptiveThresholdService,
      stakeholderReportingService,
      businessAlertingEngine,
      productionMonitoringService,
      errorTrackingService,
      realTimeMonitoringService
    ];

    for (const service of services) {
      try {
        if (service.shutdown) {
          await service.shutdown();
        }
      } catch (error) {
        logger.error(`Error shutting down service: ${error.message}`);
      }
    }

    this.isDeploying = false;
    logger.info('✅ All services shut down successfully');
  }
}

// Export singleton instance
const productionDeploymentOrchestrator = new ProductionDeploymentOrchestrator();
module.exports = productionDeploymentOrchestrator;
