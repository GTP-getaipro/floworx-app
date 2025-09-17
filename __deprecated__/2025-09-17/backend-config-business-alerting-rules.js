/**
 * Business-Driven Alerting Rules for FloWorx SaaS
 * Comprehensive alerting configuration based on business impact and SLA requirements
 */

const businessAlertingRules = {
  // SLA-based alerting rules
  slaRules: {
    // API Response Time SLAs
    apiResponseTime: {
      name: 'API Response Time SLA',
      description: 'Monitor API response times against SLA commitments',
      enabled: true,
      rules: [
        {
          condition: 'average_response_time > 2000', // 2 seconds
          severity: 'critical',
          message: 'API response time exceeding SLA (2s)',
          businessImpact: 'high',
          affectedUsers: 'all',
          escalationTime: 5, // minutes
          channels: ['pagerduty', 'slack', 'email']
        },
        {
          condition: 'average_response_time > 1000', // 1 second
          severity: 'high',
          message: 'API response time approaching SLA limit',
          businessImpact: 'medium',
          affectedUsers: 'all',
          escalationTime: 15,
          channels: ['slack', 'email']
        }
      ]
    },

    // System Availability SLA
    systemAvailability: {
      name: 'System Availability SLA',
      description: 'Monitor system uptime against 99.9% SLA',
      enabled: true,
      rules: [
        {
          condition: 'uptime_percentage < 99.9',
          severity: 'critical',
          message: 'System availability below SLA (99.9%)',
          businessImpact: 'critical',
          affectedUsers: 'all',
          escalationTime: 1, // immediate
          channels: ['pagerduty', 'slack', 'email', 'teams']
        },
        {
          condition: 'uptime_percentage < 99.95',
          severity: 'high',
          message: 'System availability approaching SLA threshold',
          businessImpact: 'high',
          affectedUsers: 'all',
          escalationTime: 5,
          channels: ['slack', 'email']
        }
      ]
    },

    // Data Processing SLA
    dataProcessing: {
      name: 'Data Processing SLA',
      description: 'Monitor email processing and workflow execution times',
      enabled: true,
      rules: [
        {
          condition: 'workflow_execution_time > 300', // 5 minutes
          severity: 'high',
          message: 'Workflow execution time exceeding SLA',
          businessImpact: 'high',
          affectedUsers: 'workflow_users',
          escalationTime: 10,
          channels: ['slack', 'email']
        },
        {
          condition: 'email_processing_delay > 600', // 10 minutes
          severity: 'critical',
          message: 'Email processing severely delayed',
          businessImpact: 'critical',
          affectedUsers: 'all',
          escalationTime: 5,
          channels: ['pagerduty', 'slack', 'email']
        }
      ]
    }
  },

  // User impact-based alerting
  userImpactRules: {
    // User Onboarding Issues
    onboardingImpact: {
      name: 'User Onboarding Impact',
      description: 'Alert on issues affecting new user onboarding',
      enabled: true,
      rules: [
        {
          condition: 'onboarding_failure_rate > 0.20', // 20%
          severity: 'critical',
          message: 'High onboarding failure rate detected',
          businessImpact: 'critical',
          affectedUsers: 'new_users',
          escalationTime: 10,
          channels: ['pagerduty', 'slack', 'email'],
          businessContext: {
            revenueImpact: 'high',
            customerSatisfaction: 'critical',
            churnRisk: 'high'
          }
        },
        {
          condition: 'onboarding_completion_time > 900', // 15 minutes
          severity: 'high',
          message: 'Onboarding taking longer than expected',
          businessImpact: 'medium',
          affectedUsers: 'new_users',
          escalationTime: 30,
          channels: ['slack', 'email']
        }
      ]
    },

    // OAuth Connection Issues
    oauthImpact: {
      name: 'OAuth Connection Impact',
      description: 'Alert on OAuth connection failures affecting user experience',
      enabled: true,
      rules: [
        {
          condition: 'oauth_failure_rate > 0.10', // 10%
          severity: 'critical',
          message: 'High OAuth connection failure rate',
          businessImpact: 'critical',
          affectedUsers: 'connecting_users',
          escalationTime: 5,
          channels: ['pagerduty', 'slack', 'email'],
          businessContext: {
            revenueImpact: 'high',
            customerSatisfaction: 'critical',
            featureAvailability: 'blocked'
          }
        },
        {
          condition: 'google_service_down = true',
          severity: 'high',
          message: 'Google services unavailable',
          businessImpact: 'high',
          affectedUsers: 'all',
          escalationTime: 15,
          channels: ['slack', 'email']
        }
      ]
    },

    // Active User Experience
    activeUserExperience: {
      name: 'Active User Experience',
      description: 'Monitor issues affecting existing active users',
      enabled: true,
      rules: [
        {
          condition: 'active_user_error_rate > 0.05', // 5%
          severity: 'high',
          message: 'High error rate for active users',
          businessImpact: 'high',
          affectedUsers: 'active_users',
          escalationTime: 15,
          channels: ['slack', 'email'],
          businessContext: {
            churnRisk: 'medium',
            customerSatisfaction: 'high'
          }
        },
        {
          condition: 'workflow_failure_rate > 0.15', // 15%
          severity: 'critical',
          message: 'High workflow failure rate affecting users',
          businessImpact: 'critical',
          affectedUsers: 'workflow_users',
          escalationTime: 5,
          channels: ['pagerduty', 'slack', 'email']
        }
      ]
    }
  },

  // Business process alerting
  businessProcessRules: {
    // Revenue Impact Alerts
    revenueImpact: {
      name: 'Revenue Impact Monitoring',
      description: 'Alert on issues that directly impact revenue',
      enabled: true,
      rules: [
        {
          condition: 'payment_processing_failure_rate > 0.02', // 2%
          severity: 'critical',
          message: 'Payment processing failures detected',
          businessImpact: 'critical',
          affectedUsers: 'paying_customers',
          escalationTime: 1,
          channels: ['pagerduty', 'slack', 'email', 'teams'],
          businessContext: {
            revenueImpact: 'direct',
            urgency: 'immediate'
          }
        },
        {
          condition: 'subscription_signup_failure_rate > 0.10', // 10%
          severity: 'high',
          message: 'High subscription signup failure rate',
          businessImpact: 'high',
          affectedUsers: 'potential_customers',
          escalationTime: 10,
          channels: ['slack', 'email']
        }
      ]
    },

    // Customer Success Alerts
    customerSuccess: {
      name: 'Customer Success Monitoring',
      description: 'Alert on issues affecting customer success metrics',
      enabled: true,
      rules: [
        {
          condition: 'daily_active_users_drop > 0.20', // 20% drop
          severity: 'high',
          message: 'Significant drop in daily active users',
          businessImpact: 'high',
          affectedUsers: 'all',
          escalationTime: 30,
          channels: ['slack', 'email'],
          businessContext: {
            churnRisk: 'high',
            engagementImpact: 'critical'
          }
        },
        {
          condition: 'feature_adoption_rate < 0.30', // 30%
          severity: 'medium',
          message: 'Low feature adoption rate detected',
          businessImpact: 'medium',
          affectedUsers: 'new_users',
          escalationTime: 60,
          channels: ['slack']
        }
      ]
    },

    // Operational Excellence
    operationalExcellence: {
      name: 'Operational Excellence',
      description: 'Monitor operational metrics and system health',
      enabled: true,
      rules: [
        {
          condition: 'database_connection_pool_exhausted = true',
          severity: 'critical',
          message: 'Database connection pool exhausted',
          businessImpact: 'critical',
          affectedUsers: 'all',
          escalationTime: 2,
          channels: ['pagerduty', 'slack', 'email']
        },
        {
          condition: 'n8n_service_unavailable = true',
          severity: 'critical',
          message: 'N8N workflow service unavailable',
          businessImpact: 'critical',
          affectedUsers: 'workflow_users',
          escalationTime: 5,
          channels: ['pagerduty', 'slack', 'email']
        }
      ]
    }
  },

  // Time-based alerting rules
  timeBasedRules: {
    // Business Hours vs Off-Hours
    businessHours: {
      name: 'Business Hours Alerting',
      description: 'Different alerting behavior during business hours',
      enabled: true,
      timezone: 'America/New_York',
      businessHours: {
        start: '09:00',
        end: '17:00',
        weekdays: [1, 2, 3, 4, 5] // Monday to Friday
      },
      rules: {
        duringBusinessHours: {
          escalationTime: 15, // minutes
          channels: ['slack', 'email'],
          responseTime: 30 // expected response time in minutes
        },
        outsideBusinessHours: {
          escalationTime: 60, // minutes
          channels: ['pagerduty', 'email'],
          responseTime: 120 // expected response time in minutes
        },
        criticalAlwaysEscalate: {
          escalationTime: 5, // always escalate critical alerts quickly
          channels: ['pagerduty', 'slack', 'email', 'teams']
        }
      }
    },

    // Peak Usage Hours
    peakHours: {
      name: 'Peak Usage Hours',
      description: 'Enhanced monitoring during peak usage',
      enabled: true,
      peakHours: [
        { start: '08:00', end: '10:00' }, // Morning peak
        { start: '13:00', end: '14:00' }, // Lunch peak
        { start: '17:00', end: '19:00' }  // Evening peak
      ],
      rules: {
        lowerThresholds: {
          responseTime: 1500, // Lower threshold during peak
          errorRate: 0.02,    // Lower error rate tolerance
          connectionCount: 20  // Lower connection threshold
        },
        enhancedMonitoring: {
          frequency: 30000, // 30 seconds instead of 60
          channels: ['slack', 'email']
        }
      }
    }
  },

  // Escalation procedures
  escalationProcedures: {
    // Level 1: Automated Response
    level1: {
      name: 'Automated Response',
      description: 'Immediate automated actions',
      timeframe: 0, // immediate
      actions: [
        'log_alert',
        'send_notifications',
        'attempt_auto_recovery',
        'collect_diagnostics'
      ],
      channels: ['slack']
    },

    // Level 2: On-Call Engineer
    level2: {
      name: 'On-Call Engineer',
      description: 'Alert on-call engineering team',
      timeframe: 15, // 15 minutes
      actions: [
        'page_oncall_engineer',
        'create_incident_ticket',
        'escalate_to_slack',
        'send_detailed_diagnostics'
      ],
      channels: ['pagerduty', 'slack', 'email']
    },

    // Level 3: Engineering Manager
    level3: {
      name: 'Engineering Manager',
      description: 'Escalate to engineering management',
      timeframe: 45, // 45 minutes
      actions: [
        'notify_engineering_manager',
        'create_high_priority_ticket',
        'schedule_war_room',
        'notify_customer_success'
      ],
      channels: ['pagerduty', 'slack', 'email', 'teams']
    },

    // Level 4: Executive Team
    level4: {
      name: 'Executive Escalation',
      description: 'Critical business impact escalation',
      timeframe: 120, // 2 hours
      actions: [
        'notify_cto',
        'notify_ceo',
        'prepare_customer_communication',
        'activate_crisis_protocol'
      ],
      channels: ['pagerduty', 'email', 'teams']
    }
  },

  // Alert suppression rules
  suppressionRules: {
    // Maintenance Windows
    maintenanceWindows: {
      enabled: true,
      suppressDuring: [
        {
          name: 'Weekly Maintenance',
          schedule: 'cron:0 2 * * 0', // Sunday 2 AM
          duration: 120, // 2 hours
          suppressTypes: ['system', 'database', 'performance']
        },
        {
          name: 'Deployment Window',
          schedule: 'manual', // Manually triggered
          duration: 60, // 1 hour
          suppressTypes: ['all']
        }
      ]
    },

    // Known Issues
    knownIssues: {
      enabled: true,
      suppressionPatterns: [
        {
          pattern: 'google_api_rate_limit',
          duration: 300, // 5 minutes
          reason: 'Known Google API rate limiting'
        },
        {
          pattern: 'n8n_temporary_unavailable',
          duration: 180, // 3 minutes
          reason: 'N8N service restart'
        }
      ]
    }
  },

  // Alert correlation rules
  correlationRules: {
    // Group related alerts
    grouping: {
      enabled: true,
      rules: [
        {
          name: 'Database Issues',
          pattern: ['database_*', 'connection_*', 'query_*'],
          groupWindow: 300, // 5 minutes
          maxAlerts: 1 // Send only one grouped alert
        },
        {
          name: 'OAuth Issues',
          pattern: ['oauth_*', 'google_*', 'authentication_*'],
          groupWindow: 180, // 3 minutes
          maxAlerts: 1
        }
      ]
    },

    // Dependency mapping
    dependencies: {
      enabled: true,
      rules: [
        {
          service: 'database',
          dependents: ['api', 'workflows', 'authentication'],
          suppressDependentAlerts: true,
          suppressionDuration: 600 // 10 minutes
        },
        {
          service: 'n8n',
          dependents: ['workflows', 'automation'],
          suppressDependentAlerts: true,
          suppressionDuration: 300 // 5 minutes
        }
      ]
    }
  }
};

module.exports = businessAlertingRules;
